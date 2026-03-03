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

def check_updates():
    project_id, credentials = get_credentials()
    client = bigquery.Client(project=project_id, credentials=credentials)
    
    tables = [
        "stock_data.processed_stock_data",
        "stock_data.processed_stock_data_history",
        "stock_data.processed_stock_data_industry_history",
        "stock_data.processed_stock_data_sector_history"
    ]
    
    print("Checking latest updates for BigQuery tables...")
    for table in tables:
        try:
            query = f"SELECT MAX(processed_at) as latest_update FROM `{project_id}.{table}`"
            results = client.query(query).result()
            for row in results:
                print(f"Table {table}: {row.latest_update}")
        except Exception as e:
            print(f"Error checking {table}: {e}")

if __name__ == '__main__':
    check_updates()
