'use server';

import axios from 'axios';
import { parse } from 'csv-parse/sync';
import { IndustryApiResponse, OverviewRow, PerformanceRow, ValuationRow } from '@/types';
import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { uploadToGCS, listGCSFiles, getGCSFileContent } from './gcs';

const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Memory cache (optional/secondary now that we verify disk)
let cachedData: IndustryApiResponse | null = null;

export async function refreshMarketData() {
    console.log('Force refreshing market data...');
    await getIndustryPerformance(undefined, true);
    revalidatePath('/');
}

function parseMarketCap(cap: string): number {
    if (!cap) return 0;
    const value = parseFloat(cap.replace(/[^0-9.]/g, ''));
    if (cap.endsWith('B')) return value * 1_000_000_000;
    if (cap.endsWith('M')) return value * 1_000_000;
    if (cap.endsWith('K')) return value * 1_000;
    return value;
}

function parsePercent(perf: string): number {
    if (!perf || perf === '-') return 0;
    return parseFloat(perf.replace('%', ''));
}

function getDateString(timestamp: number): string {
    return new Date(timestamp).toISOString().split('T')[0];
}

async function fetchCsv<T>(viewId: string): Promise<T[]> {
    const BASE_URL = process.env.FINVIZ_API_URL || 'https://elite.finviz.com/export.ashx';
    const API_KEY = process.env.FINVIZ_API_KEY;

    if (!API_KEY) {
        throw new Error('FINVIZ_API_KEY is not defined');
    }

    const url = `${BASE_URL}?v=${viewId}&f=cap_midover&auth=${API_KEY}`;
    console.log(`Fetching Finviz view ${viewId}...`);
    const response = await axios.get(url, { responseType: 'text' });
    return parse(response.data, {
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
    }) as T[];
}

/**
 * Merges multiple views into a single CSV and saves it.
 */
async function exportFullTickerData(
    timestamp: number,
    overview: any[],
    valuation: any[],
    financial: any[],
    performance: any[],
    technical: any[],
    custom: any[]
) {
    console.log('Merging all views for full CSV export...');
    const fullData = new Map<string, any>();

    const allViews = [overview, valuation, financial, performance, technical, custom];

    allViews.forEach(viewRows => {
        viewRows.forEach(row => {
            const ticker = row.Ticker;
            if (!ticker) return;

            if (!fullData.has(ticker)) {
                fullData.set(ticker, { ...row });
            } else {
                const existing = fullData.get(ticker);
                fullData.set(ticker, { ...existing, ...row });
            }
        });
    });

    const mergedRows = Array.from(fullData.values());
    if (mergedRows.length === 0) return;

    // Generate CSV
    const allHeaders = new Set<string>();
    mergedRows.forEach(row => Object.keys(row).forEach(h => allHeaders.add(h)));
    const headers = Array.from(allHeaders);

    const csvContent = [
        headers.map(h => `"${h}"`).join(','),
        ...mergedRows.map(row =>
            headers.map(header => {
                const val = row[header] ?? '';
                const stringVal = String(val).replace(/"/g, '""');
                return `"${stringVal}"`;
            }).join(',')
        )
    ].join('\n');

    const dateStr = getDateString(timestamp);
    const filename = `full_export_${dateStr}.csv`;

    // Save locally
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, csvContent);

    // Upload to GCS
    await uploadToGCS(filename, csvContent, 'text/csv');

    console.log(`Saved full export: ${filename} (${mergedRows.length} tickers)`);
}

async function saveSnapshot(data: IndustryApiResponse) {
    const dateStr = getDateString(data.lastUpdated);
    const filename = `snapshot_${dateStr}.json`;
    const content = JSON.stringify(data, null, 2);

    // Save locally
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, content);

    // Upload to GCS
    await uploadToGCS(filename, content, 'application/json');

    console.log(`Saved snapshot: ${filename}`);
}

export async function getAvailableSnapshots() {
    try {
        const query = `
            SELECT DISTINCT CAST(processed_at AS STRING) as snapshot_date
            FROM \`${process.env.GCP_PROJECT_ID}.stock_data.processed_stock_data_history\`
            ORDER BY snapshot_date DESC
            LIMIT 50
        `;

        const rows = await queryBigQuery(query);

        return rows.map((row: any) => {
            const dateStr = row.snapshot_date.value; // BigQuery timestamp comes as { value: string } usually, or just string depending on client version
            // But let's handle the string direct since we CAST to STRING
            const validDateStr = typeof row.snapshot_date === 'string' ? row.snapshot_date : row.snapshot_date?.value;

            const timestamp = new Date(validDateStr).getTime();

            return {
                id: validDateStr,
                label: new Date(timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'UTC'
                }),
                timestamp
            };
        });
    } catch (e) {
        console.error('Error fetching snapshots from BigQuery:', e);
        return [];
    }
}

import { queryBigQuery } from './bigquery';

export async function getAvailableSectors(snapshotId?: string) {
    try {
        const query = `
            SELECT DISTINCT sector
            FROM \`${process.env.GCP_PROJECT_ID}.stock_data.processed_stock_data_history\`
            WHERE ${snapshotId && snapshotId !== 'live' ? `CAST(processed_at AS STRING) = '${snapshotId}'` : "is_current = 'yes'"}
            AND sector IS NOT NULL
            ORDER BY sector
        `;

        const rows = await queryBigQuery(query);
        return rows.map((r: any) => r.sector);
    } catch (e) {
        console.error('Error fetching sectors:', e);
        return [];
    }
}

export async function getIndustryPerformance(
    snapshotId?: string,
    forceFetch = false,
    groupBy: 'industry' | 'sector' = 'industry',
    sectorFilter?: string
): Promise<IndustryApiResponse> {
    try {
        console.log(`Fetching ${groupBy} data from BigQuery...${sectorFilter ? ` Filter: ${sectorFilter}` : ''}`);

        // This is a simplified query. In a real scenario, you'd aggregate the processed_stock_data
        // similar to how it was done in the previous implementation, or have a dedicated view/table for it.
        // For now, let's assume we want to aggregate the latest data.

        const groupCol = groupBy === 'sector' ? 'sector' : 'industry';

        const query = `
            WITH latest_data AS (
                SELECT *
                FROM \`${process.env.GCP_PROJECT_ID}.stock_data.processed_stock_data_history\`
                WHERE ${snapshotId && snapshotId !== 'live' ? `CAST(processed_at AS STRING) = '${snapshotId}'` : "is_current = 'yes'"}
            ),
            clean_data AS (
                SELECT 
                    industry,
                    sector,
                    ticker,
                    processed_at,
                    SAFE_CAST(REPLACE(performance_week, '%', '') AS FLOAT64) as pct_week,
                    SAFE_CAST(REPLACE(performance_month, '%', '') AS FLOAT64) as pct_month,
                    SAFE_CAST(market_cap AS FLOAT64) * 1000000 as mcap
                FROM latest_data
                ${sectorFilter && groupBy === 'industry' ? `WHERE sector = '${sectorFilter}'` : ''}
            )
            SELECT 
                ${groupCol} as name,
                -- Market-Cap Weighted
                SUM(pct_week * mcap) / NULLIF(SUM(mcap), 0) as week,
                SUM(pct_month * mcap) / NULLIF(SUM(mcap), 0) as month,
                (SUM(pct_week * mcap) / NULLIF(SUM(mcap), 0)) - (SUM(pct_month * mcap) / NULLIF(SUM(mcap), 0)) as momentum,
                
                -- Equal Weighted
                AVG(pct_week) as weekEqual,
                AVG(pct_month) as monthEqual,
                AVG(pct_week) - AVG(pct_month) as momentumEqual,
                
                SUM(mcap) as marketCap,
                COUNT(*) as stockCount,
                
                -- Get the latest timestamp from the group
                MAX(processed_at) as processed_at,

                -- Top Drivers (Top 5 by weekly performance)
                ARRAY_AGG(
                    STRUCT(ticker, pct_week as week) IGNORE NULLS ORDER BY pct_week DESC LIMIT 5
                ) as topStocks
            FROM clean_data
            GROUP BY ${groupCol}
            ORDER BY momentum DESC
        `;

        const results = await queryBigQuery(query);

        // Use the actual processed_at from the data if available, otherwise fallback
        const firstRow = results.length > 0 ? results[0] : null;
        let dataTimestamp = Date.now();

        if (firstRow && firstRow.processed_at) {
            const val = firstRow.processed_at.value || firstRow.processed_at;
            dataTimestamp = new Date(val).getTime();
        }

        // Clean data for client serialization
        const cleanResults = results.map((row: any) => {
            const timestampVal = row.processed_at?.value || row.processed_at;
            let processedAtTs = null;
            if (timestampVal) {
                // If it's a BigQuery timestamp string or object
                processedAtTs = new Date(timestampVal).getTime();
            }

            return {
                ...row,
                processed_at: processedAtTs
            };
        });

        return {
            data: cleanResults as any[],
            lastUpdated: dataTimestamp,
        };

    } catch (error) {
        console.error('Error fetching data from BigQuery:', error);
        return { data: [], lastUpdated: 0 };
    }
}
