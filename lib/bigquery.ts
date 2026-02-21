import { BigQuery } from '@google-cloud/bigquery';
import { config } from './config';
import { getGcpCredentials } from './gcloud';

let bigquery: BigQuery | null = null;
const creds = getGcpCredentials();

if (creds) {
    bigquery = new BigQuery(creds);
} else {
    console.warn('BigQuery not configured. Ensure GCP environment variables are set.');
}

export async function queryBigQuery(query: string, params?: any) {
    if (!bigquery) {
        throw new Error('BigQuery client not initialized');
    }

    const options = {
        query: query,
        params: params,
        location: 'US', // Adjust as needed
    };

    const [rows] = await bigquery.query(options);
    return rows;
}

export async function getLatestProcessedData() {
    const query = `
        SELECT *
        FROM \`${config.gcp.projectId}.stock_data.processed_stock_data_history\`
        WHERE is_current = 'yes'
        LIMIT 1000
    `;
    return queryBigQuery(query);
}
