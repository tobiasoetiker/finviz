import os
from google.cloud import bigquery
from google.oauth2 import service_account

def get_credentials():
    env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.local')
    env_vars = {}
    with open(env_file, 'r') as f:
        for line in f:
            if '=' in line:
                key, val = line.strip().split('=', 1)
                env_vars[key] = val
                
    project_id = env_vars.get('GCP_PROJECT_ID')
    client_email = env_vars.get('GCP_CLIENT_EMAIL')
    private_key = env_vars.get('GCP_PRIVATE_KEY', '').replace('\\n', '\n').strip('"')
    
    credentials = service_account.Credentials.from_service_account_info({
        "type": "service_account",
        "project_id": project_id,
        "private_key_id": "",
        "private_key": private_key,
        "client_email": client_email,
        "client_id": "",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{client_email.replace('@', '%40')}"
    })
    
    return project_id, credentials

def backfill():
    project_id, credentials = get_credentials()
    client = bigquery.Client(project=project_id, credentials=credentials)
    
    print(f"Connected to BigQuery project {project_id}")
    
    # Industry Table
    query_industry = f"""
    CREATE OR REPLACE TABLE `{project_id}.stock_data.processed_stock_data_industry_history` AS
    WITH raw_data AS (
        SELECT 
            industry,
            sector,
            processed_at,
            is_current,
            SAFE_CAST(REPLACE(performance_week, '%', '') AS FLOAT64) as pct_week,
            SAFE_CAST(REPLACE(performance_month, '%', '') AS FLOAT64) as pct_month,
            SAFE_CAST(relative_strength_index_14 AS FLOAT64) as rsi,
            SAFE_CAST(market_cap AS FLOAT64) * 1000000 as mcap,
            ticker
        FROM `{project_id}.stock_data.processed_stock_data_history`
    )
    SELECT 
        CAST(processed_at AS STRING) as snapshot_id,
        MAX(processed_at) as processed_at,
        is_current,
        industry as name,
        ANY_VALUE(sector) as parent_sector,
        -- Market-Cap Weighted
        SUM(pct_week * mcap) / NULLIF(SUM(mcap), 0) as week,
        SUM(pct_month * mcap) / NULLIF(SUM(mcap), 0) as month,
        SUM(rsi * mcap) / NULLIF(SUM(mcap), 0) as rsi,
        (SUM(pct_week * mcap) / NULLIF(SUM(mcap), 0)) - ((SUM(pct_month * mcap) / NULLIF(SUM(mcap), 0)) / 4) as momentum,
        -- Equal Weighted
        AVG(pct_week) as weekEqual,
        AVG(pct_month) as monthEqual,
        AVG(rsi) as rsiEqual,
        AVG(pct_week) - (AVG(pct_month) / 4) as momentumEqual,
        
        SUM(mcap) as marketCap,
        COUNT(*) as stockCount,

        -- Top Drivers
        ARRAY_AGG(
            STRUCT(ticker, pct_week as week) IGNORE NULLS ORDER BY pct_week DESC LIMIT 5
        ) as topStocks
    FROM raw_data
    WHERE industry IS NOT NULL
    GROUP BY CAST(processed_at AS STRING), is_current, industry;
    """
    
    print("Creating Industry aggregated table...")
    client.query(query_industry).result()
    print("Success.")
    
    # Sector Table
    query_sector = f"""
    CREATE OR REPLACE TABLE `{project_id}.stock_data.processed_stock_data_sector_history` AS
    WITH raw_data AS (
        SELECT 
            sector,
            processed_at,
            is_current,
            SAFE_CAST(REPLACE(performance_week, '%', '') AS FLOAT64) as pct_week,
            SAFE_CAST(REPLACE(performance_month, '%', '') AS FLOAT64) as pct_month,
            SAFE_CAST(relative_strength_index_14 AS FLOAT64) as rsi,
            SAFE_CAST(market_cap AS FLOAT64) * 1000000 as mcap,
            ticker
        FROM `{project_id}.stock_data.processed_stock_data_history`
    )
    SELECT 
        CAST(processed_at AS STRING) as snapshot_id,
        MAX(processed_at) as processed_at,
        is_current,
        sector as name,
        CAST(NULL as STRING) as parent_sector,
        -- Market-Cap Weighted
        SUM(pct_week * mcap) / NULLIF(SUM(mcap), 0) as week,
        SUM(pct_month * mcap) / NULLIF(SUM(mcap), 0) as month,
        SUM(rsi * mcap) / NULLIF(SUM(mcap), 0) as rsi,
        (SUM(pct_week * mcap) / NULLIF(SUM(mcap), 0)) - ((SUM(pct_month * mcap) / NULLIF(SUM(mcap), 0)) / 4) as momentum,
        -- Equal Weighted
        AVG(pct_week) as weekEqual,
        AVG(pct_month) as monthEqual,
        AVG(rsi) as rsiEqual,
        AVG(pct_week) - (AVG(pct_month) / 4) as momentumEqual,
        
        SUM(mcap) as marketCap,
        COUNT(*) as stockCount,

        -- Top Drivers
        ARRAY_AGG(
            STRUCT(ticker, pct_week as week) IGNORE NULLS ORDER BY pct_week DESC LIMIT 5
        ) as topStocks
    FROM raw_data
    WHERE sector IS NOT NULL
    GROUP BY CAST(processed_at AS STRING), is_current, sector;
    """
    
    print("Creating Sector aggregated table...")
    client.query(query_sector).result()
    print("Success.")

if __name__ == '__main__':
    backfill()
