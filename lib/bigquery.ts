import { BigQuery } from '@google-cloud/bigquery';

const projectId = process.env.GCP_PROJECT_ID;
const clientEmail = process.env.GCP_CLIENT_EMAIL;
const privateKey = process.env.GCP_PRIVATE_KEY
    ? process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"|"$/g, '')
    : undefined;

let bigquery: BigQuery | null = null;

if (projectId && clientEmail && privateKey) {
    bigquery = new BigQuery({
        projectId,
        credentials: {
            client_email: clientEmail,
            private_key: privateKey,
        },
    });
} else {
    console.warn('BigQuery not configured. Ensure GCP_PROJECT_ID, GCP_CLIENT_EMAIL, and GCP_PRIVATE_KEY are set.');
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
        FROM \`${projectId}.stock_data.processed_stock_data_history\`
        WHERE is_current = 'yes'
        LIMIT 1000
    `;
    return queryBigQuery(query);
}
