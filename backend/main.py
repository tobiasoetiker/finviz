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
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

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

def aggregate_current_data(dataset_id, base_table_name):
    """Aggregates the current snapshot and appends to the industry and sector history tables."""
    try:
        client = bigquery.Client()
        project_id = client.project
        raw_table = f"{project_id}.{dataset_id}.{base_table_name}_history"
        industry_table = f"{project_id}.{dataset_id}.{base_table_name}_industry_history"
        sector_table = f"{project_id}.{dataset_id}.{base_table_name}_sector_history"
        
        # 1. Set current='no' in aggregate tables
        for table in [industry_table, sector_table]:
            try:
                client.query(f"UPDATE `{table}` SET is_current = 'no' WHERE is_current = 'yes'").result()
            except Exception as e:
                logger.warning(f"Could not update is_current in {table}: {e}")
                
        # 2. Insert Industry Aggregation
        query_industry = f"""
        INSERT INTO `{industry_table}`
        WITH raw_data AS (
            SELECT 
                industry, sector, processed_at, is_current, ticker,
                SAFE_CAST(REPLACE(performance_week, '%', '') AS FLOAT64) as pct_week,
                SAFE_CAST(REPLACE(performance_month, '%', '') AS FLOAT64) as pct_month,
                SAFE_CAST(relative_strength_index_14 AS FLOAT64) as rsi,
                SAFE_CAST(market_cap AS FLOAT64) * 1000000 as mcap
            FROM `{raw_table}`
            WHERE is_current = 'yes'
        )
        SELECT 
            CAST(processed_at AS STRING) as snapshot_id, MAX(processed_at) as processed_at, 'yes' as is_current,
            industry as name, ANY_VALUE(sector) as parent_sector,
            SUM(pct_week * mcap) / NULLIF(SUM(mcap), 0) as week,
            SUM(pct_month * mcap) / NULLIF(SUM(mcap), 0) as month,
            SUM(rsi * mcap) / NULLIF(SUM(mcap), 0) as rsi,
            (SUM(pct_week * mcap) / NULLIF(SUM(mcap), 0)) - ((SUM(pct_month * mcap) / NULLIF(SUM(mcap), 0)) / 4) as momentum,
            AVG(pct_week) as weekEqual, AVG(pct_month) as monthEqual, AVG(rsi) as rsiEqual, AVG(pct_week) - (AVG(pct_month) / 4) as momentumEqual,
            SUM(mcap) as marketCap, COUNT(*) as stockCount,
            ARRAY_AGG(STRUCT(ticker, pct_week as week) IGNORE NULLS ORDER BY pct_week DESC LIMIT 5) as topStocks
        FROM raw_data WHERE industry IS NOT NULL GROUP BY CAST(processed_at AS STRING), industry
        """
        client.query(query_industry).result()
        logger.info(f"Appended current industry aggregation to {industry_table}.")
        
        # 3. Insert Sector Aggregation
        query_sector = f"""
        INSERT INTO `{sector_table}`
        WITH raw_data AS (
            SELECT 
                sector, processed_at, is_current, ticker,
                SAFE_CAST(REPLACE(performance_week, '%', '') AS FLOAT64) as pct_week,
                SAFE_CAST(REPLACE(performance_month, '%', '') AS FLOAT64) as pct_month,
                SAFE_CAST(relative_strength_index_14 AS FLOAT64) as rsi,
                SAFE_CAST(market_cap AS FLOAT64) * 1000000 as mcap
            FROM `{raw_table}`
            WHERE is_current = 'yes'
        )
        SELECT 
            CAST(processed_at AS STRING) as snapshot_id, MAX(processed_at) as processed_at, 'yes' as is_current,
            sector as name, CAST(NULL as STRING) as parent_sector,
            SUM(pct_week * mcap) / NULLIF(SUM(mcap), 0) as week,
            SUM(pct_month * mcap) / NULLIF(SUM(mcap), 0) as month,
            SUM(rsi * mcap) / NULLIF(SUM(mcap), 0) as rsi,
            (SUM(pct_week * mcap) / NULLIF(SUM(mcap), 0)) - ((SUM(pct_month * mcap) / NULLIF(SUM(mcap), 0)) / 4) as momentum,
            AVG(pct_week) as weekEqual, AVG(pct_month) as monthEqual, AVG(rsi) as rsiEqual, AVG(pct_week) - (AVG(pct_month) / 4) as momentumEqual,
            SUM(mcap) as marketCap, COUNT(*) as stockCount,
            ARRAY_AGG(STRUCT(ticker, pct_week as week) IGNORE NULLS ORDER BY pct_week DESC LIMIT 5) as topStocks
        FROM raw_data WHERE sector IS NOT NULL GROUP BY CAST(processed_at AS STRING), sector
        """
        client.query(query_sector).result()
        logger.info(f"Appended current sector aggregation to {sector_table}.")
        
    except Exception as e:
        logger.error(f"Failed to aggregate current data: {e}")
        raise

def fetch_view(view_name, view_id, filter_param, api_url, api_key):
    """Renames columns to be BigQuery friendly."""
    import re
    # Lowercase, replace special chars with _, strip leading/trailing underscores
    df.columns = [re.sub(r'[^a-z0-9_]', '_', c.lower()).strip('_') for c in df.columns]
    # Avoid double underscores
    df.columns = [re.sub(r'_{2,}', '_', c) for c in df.columns]
    return df

def _log_retry(retry_state):
    logger.warning(f"Retrying Finviz fetch after exception (attempt {retry_state.attempt_number}): {retry_state.outcome.exception()}")

@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=2, min=4, max=60),
    retry=retry_if_exception_type(Exception),
    before_sleep=_log_retry,
    reraise=True
)
def fetch_view_api(url, view_name):
    """Fetches Finviz view with exponential backoff on any exception."""
    response = requests.get(url, timeout=30)
    
    # Let requests handle raising HTTP parsing errors
    response.raise_for_status()
    
    # Catch empty responses which occur occasionally on FinViz timeout
    if not response.text or len(response.text.strip()) == 0:
         raise ValueError(f"View {view_name} returned an empty payload.")
         
    df = pd.read_csv(io.StringIO(response.text))
    if df.empty:
        raise ValueError(f"View {view_name} returned a CSV with no visible rows.")
    return df

def fetch_view(view_name, view_id, filter_param, api_url, api_key):
    """Entry point for fetching a Finviz View. Will hard crash the flow if it fails after all retries."""
    url = f"{api_url}?v={view_id}&f={filter_param}&auth={api_key}"
    logger.info(f"Fetching view: {view_name} (v={view_id})...")
    
    # We let tenacity handle the retry and simply bubble up the Exception if it ultimately fails
    return fetch_view_api(url, view_name)


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

        # List of views to fetch and merge
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
            df_view = fetch_view(view_name, view_id, filter_param, FINVIZ_API_URL, FINVIZ_API_KEY)
            
            # Since fetch_view now raises on permanent failure, if we get here we have valid data.
            if merged_df is None:
                merged_df = df_view
            else:
                # Merge on Ticker, avoiding duplicate columns except Ticker
                cols_to_use = df_view.columns.difference(merged_df.columns).tolist()
                cols_to_use.append('Ticker')
                merged_df = pd.merge(merged_df, df_view[cols_to_use], on='Ticker', how='outer')
            
            # Add a small delay between views to avoid rate limits
            time.sleep(2)

        if merged_df is None or merged_df.empty:
            logger.warning("No data fetched from FinViz views.")
            return "No data fetched", 200

        df = merged_df
        # 2. Raw Storage: Save untouched raw data to GCS
        raw_data = df.to_json(orient='records')
        upload_to_gcs(RAW_BUCKET_NAME, raw_filename, raw_data)
        
        # 3. Transformation: Process the raw data
        logger.info("Starting data transformation...")
        df = normalize_columns(df)
        
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
        
        # 4c. Pre-calculate aggregations into historical tables
        aggregate_current_data(BQ_DATASET, BQ_TABLE_BASE)
        
        return f"Successfully processed {len(df)} tickers into {daily_table} and {BQ_TABLE_HISTORY}.", 200

    except Exception as e:
        logger.error(f"Error in data pipeline: {e}")
        return f"Error: {str(e)}", 500
