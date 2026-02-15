import { NextResponse } from 'next/server';
import { queryBigQuery } from '@/lib/bigquery';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const envCheck = {
            hasProject: !!process.env.GCP_PROJECT_ID,
            hasEmail: !!process.env.GCP_CLIENT_EMAIL,
            hasKey: !!process.env.GCP_PRIVATE_KEY,
            keyLength: process.env.GCP_PRIVATE_KEY ? process.env.GCP_PRIVATE_KEY.length : 0,
            // Check if key starts/ends correctly (common copy-paste error)
            validKeyFormat: process.env.GCP_PRIVATE_KEY ? process.env.GCP_PRIVATE_KEY.includes('BEGIN PRIVATE KEY') : false
        };

        // Try a simple query
        // We select the project ID to verify we are querying the right place
        const data = await queryBigQuery('SELECT 1 as test');

        return NextResponse.json({
            status: 'Connection Successful',
            envCheck,
            data
        });
    } catch (error: any) {
        return NextResponse.json({
            status: 'Connection Failed',
            error: error.message,
            // Include stack only if needed, but message is usually enough for auth errors
            envCheck: {
                hasProject: !!process.env.GCP_PROJECT_ID,
                hasEmail: !!process.env.GCP_CLIENT_EMAIL,
                hasKey: !!process.env.GCP_PRIVATE_KEY,
                keyLength: process.env.GCP_PRIVATE_KEY ? process.env.GCP_PRIVATE_KEY.length : 0,
            }
        }, { status: 500 });
    }
}
