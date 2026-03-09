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

export async function queryBigQuery<T = Record<string, unknown>>(query: string, params?: Record<string, string | number>): Promise<T[]> {
    if (!bigquery) {
        throw new Error('BigQuery client not initialized');
    }

    const options = {
        query: query,
        params: params,
        location: 'US', // Adjust as needed
    };

    const [rows] = await bigquery.query(options);
    return rows as T[];
}
