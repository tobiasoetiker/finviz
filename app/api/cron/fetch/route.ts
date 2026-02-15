import { NextResponse } from 'next/server';
import { refreshMarketData } from '@/lib/finviz';

export async function GET(request: Request) {
    // Check for Cron Secret if configured to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        console.log('Cron trigger: Refreshing market data...');
        await refreshMarketData();
        return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
    } catch (error: any) {
        console.error('Cron job failed:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
