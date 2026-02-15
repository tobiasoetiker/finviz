import functions_framework
import json
import logging
import os
import pandas as pd
import requests
import io
from datetime import datetime
from google.cloud import storage
from google.cloud import bigquery

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
RAW_BUCKET_NAME = os.environ.get('RAW_BUCKET_NAME', 'finviz-raw-data')
BQ_DATASET = os.environ.get('BQ_DATASET', 'stock_data')
BQ_TABLE_BASE = os.environ.get('BQ_TABLE', 'processed_stock_data')
BQ_TABLE_HISTORY = f"{BQ_TABLE_BASE}_history"
FINVIZ_API_KEY = os.environ.get('FINVIZ_API_KEY')
FINVIZ_API_URL = os.environ.get('FINVIZ_API_URL', 'https://elite.finviz.com/export.ashx')

def upload_to_gcs(bucket_name, destination_blob_name, data_string, content_type='application/json'):
    """Uploads a string to GCS."""
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(destination_blob_name)
        blob.upload_from_string(data_string, content_type=content_type)
        logger.info(f"File {destination_blob_name} uploaded to {bucket_name}.")
    except Exception as e:
        logger.error(f"Failed to upload to GCS: {e}")
        raise

def insert_into_bigquery(df, dataset_id, table_id, write_disposition="WRITE_APPEND"):
    """Inserts a Pandas DataFrame into BigQuery."""
    try:
        client = bigquery.Client()
        table_ref = client.dataset(dataset_id).table(table_id)
        
        job_config = bigquery.LoadJobConfig(
            write_disposition=write_disposition,
            autodetect=True,
        )
        
        job = client.load_table_from_dataframe(df, table_ref, job_config=job_config)
        job.result() # Wait for completion
        logger.info(f"Loaded {len(df)} rows into {dataset_id}.{table_id}.")
    except Exception as e:
        logger.error(f"Failed to insert into BigQuery {table_id}: {e}")
        raise

def set_all_historical(dataset_id, table_id):
    """Sets is_current to 'no' for all existing rows in the cumulative table."""
    try:
        client = bigquery.Client()
        query = f"UPDATE `{client.project}.{dataset_id}.{table_id}` SET is_current = 'no' WHERE is_current = 'yes'"
        query_job = client.query(query)
        query_job.result()
        logger.info(f"Set all legacy records to is_current='no' in {table_id}.")
    except Exception as e:
        # If the table doesn't exist yet, we might get an error. Just log and continue.
        logger.warning(f"Could not update is_current in {table_id} (might be new): {e}")

@functions_framework.http
def process_finviz_data(request):
    """Cloud Function entry point."""
    now = datetime.now()
    date_path = now.strftime('%Y/%m/%d')
    raw_filename = f"{date_path}/raw.json"
    
    try:
        logger.info("Starting FinViz data ingestion via API...")
        
        if not FINVIZ_API_KEY:
            raise ValueError("FINVIZ_API_KEY environment variable is not set.")

        # List of views to fetch and merge, similar to the Next.js app
        # v=111: Overview, v=121: Valuation, v=161: Financial, v=141: Performance, v=171: Technical, v=152: Custom
        views = [
            ('overview', '111'),
            ('valuation', '121'),
            ('financial', '161'),
            ('performance', '141'),
            ('technical', '171'),
            ('custom', '152')
        ]
        
        merged_df = None
        filter_param = "cap_midover" # Mid-cap and over

        import time
        for view_name, view_id in views:
            logger.info(f"Fetching view: {view_name} (v={view_id})...")
            url = f"{FINVIZ_API_URL}?v={view_id}&f={filter_param}&auth={FINVIZ_API_KEY}"
            
            # Simple retry logic with delay
            retries = 3
            for attempt in range(retries):
                try:
                    response = requests.get(url)
                    response.raise_for_status()
                    break
                except requests.exceptions.HTTPError as e:
                    if response.status_code == 429 and attempt < retries - 1:
                        wait_time = (attempt + 1) * 2
                        logger.warning(f"Rate limited (429). Waiting {wait_time}s...")
                        time.sleep(wait_time)
                        continue
                    raise e

            df_view = pd.read_csv(io.StringIO(response.text))
            # Add a small delay between views to avoid rate limits
            time.sleep(1)
            
            if merged_df is None:
                merged_df = df_view
            else:
                # Merge on Ticker, avoiding duplicate columns except Ticker
                cols_to_use = df_view.columns.difference(merged_df.columns).tolist()
                cols_to_use.append('Ticker')
                merged_df = pd.merge(merged_df, df_view[cols_to_use], on='Ticker', how='outer')

        if merged_df is None or merged_df.empty:
            logger.warning("No data fetched from FinViz views.")
            return "No data fetched", 200

        df = merged_df
        # 2. Raw Storage: Save untouched raw data to GCS
        raw_data = df.to_json(orient='records')
        upload_to_gcs(RAW_BUCKET_NAME, raw_filename, raw_data)
        
        # 3. Transformation: Process the raw data
        logger.info("Starting data transformation...")
        
        # Basic calculations
        # SMA 20, 50, 200 are often already in FinViz data if you use specific views, 
        # but let's assume we want to calculate some simple things if they aren't there.
        # For simplicity, we'll just ensure the output has what we need.
        
        # Rename columns to be BigQuery friendly (no spaces, etc.)
        import re
        df.columns = [re.sub(r'[^a-z0-9_]', '_', c.lower()).strip('_') for c in df.columns]
        # Avoid double underscores
        df.columns = [re.sub(r'_{2,}', '_', c) for c in df.columns]
        
        logger.info(f"Normalized columns: {df.columns.tolist()}")
        
        # Add a timestamp and current flag
        df['processed_at'] = pd.Timestamp.now()
        df['is_current'] = 'yes'
        
        # Example Calculation: Volatility (if Price and Change are available)
        if 'change' in df.columns:
            df['change_pct'] = df['change'].str.replace('%', '').astype(float)
        
        # 4. Final Storage: Layered approach
        # 4a. Daily Table (WRITE_TRUNCATE because it's only for this day)
        date_suffix = now.strftime('%Y%m%d')
        daily_table = f"{BQ_TABLE_BASE}_{date_suffix}"
        insert_into_bigquery(df, BQ_DATASET, daily_table, write_disposition="WRITE_TRUNCATE")
        
        # 4b. Cumulative/History Table
        # Update existing records to is_current='no'
        set_all_historical(BQ_DATASET, BQ_TABLE_HISTORY)
        # Append new records
        insert_into_bigquery(df, BQ_DATASET, BQ_TABLE_HISTORY, write_disposition="WRITE_APPEND")
        
        return f"Successfully processed {len(df)} tickers into {daily_table} and {BQ_TABLE_HISTORY}.", 200

    except Exception as e:
        logger.error(f"Error in data pipeline: {e}")
        return f"Error: {str(e)}", 500
