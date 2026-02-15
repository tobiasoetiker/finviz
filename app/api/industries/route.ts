import { NextResponse } from 'next/server';
import { getIndustryPerformance } from '@/lib/finviz';

export async function GET() {
    try {
        const data = await getIndustryPerformance();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching industry data:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}
