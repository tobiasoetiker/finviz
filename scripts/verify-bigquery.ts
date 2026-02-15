import { queryBigQuery } from '../lib/bigquery';

async function verify() {
    console.log('--- Verifying BigQuery Connectivity ---');
    try {
        const projectId = process.env.GCP_PROJECT_ID;
        const query = `
            SELECT count(*) as count
            FROM \`${projectId}.stock_data.processed_stock_data\`
        `;
        const results = await queryBigQuery(query);
        console.log('Success! Connection established.');
        console.log(`Current row count in BigQuery: ${results[0].count}`);
    } catch (error: any) {
        console.error('Verification failed:');
        console.error(error.message);
        if (error.message.includes('BigQuery client not initialized')) {
            console.error('Hint: Ensure GCP_PROJECT_ID, GCP_CLIENT_EMAIL, and GCP_PRIVATE_KEY are set in your environment.');
        }
    }
}

verify();
