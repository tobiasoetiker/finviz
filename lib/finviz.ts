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
    // Try GCS first, fallback to local disk
    let files: { name: string }[] = [];
    try {
        const gcsFiles = await listGCSFiles('snapshot_');
        if (gcsFiles && gcsFiles.length > 0) {
            files = gcsFiles;
        } else {
            throw new Error('No GCS files found');
        }
    } catch (e) {
        console.log('Falling back to local snapshot listing');
        if (fs.existsSync(DATA_DIR)) {
            files = fs.readdirSync(DATA_DIR).map(name => ({ name }));
        }
    }

    const snapshots = files
        .filter(f => f.name.startsWith('snapshot_') && f.name.endsWith('.json'))
        .map(f => {
            const datePart = f.name.replace('snapshot_', '').replace('.json', '');

            let timestamp: number;
            if (datePart.includes('-')) {
                timestamp = new Date(`${datePart}T00:00:00Z`).getTime();
            } else {
                timestamp = parseInt(datePart);
            }

            return {
                id: datePart,
                label: new Date(timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    timeZone: 'UTC'
                }),
                timestamp
            };
        })
        .sort((a, b) => b.timestamp - a.timestamp);

    return snapshots;
}

import { queryBigQuery } from './bigquery';

export async function getIndustryPerformance(snapshotId?: string, forceFetch = false): Promise<IndustryApiResponse> {
    try {
        console.log('Fetching industry data from BigQuery...');

        // This is a simplified query. In a real scenario, you'd aggregate the processed_stock_data
        // similar to how it was done in the previous implementation, or have a dedicated view/table for it.
        // For now, let's assume we want to aggregate the latest data.

        const query = `
            WITH latest_data AS (
                SELECT *
                FROM \`${process.env.GCP_PROJECT_ID}.stock_data.processed_stock_data\`
                WHERE processed_at = (SELECT MAX(processed_at) FROM \`${process.env.GCP_PROJECT_ID}.stock_data.processed_stock_data\`)
            )
            SELECT 
                industry as name,
                AVG(SAFE_CAST(REPLACE(performance_week, '%', '') AS FLOAT64)) as week,
                AVG(SAFE_CAST(REPLACE(performance_month, '%', '') AS FLOAT64)) as month,
                AVG(SAFE_CAST(REPLACE(performance_week, '%', '') AS FLOAT64)) - AVG(SAFE_CAST(REPLACE(performance_month, '%', '') AS FLOAT64)) as momentum,
                SUM(SAFE_CAST(REPLACE(market_cap, 'B', '') AS FLOAT64)) * 1000000000 as marketCap,
                COUNT(*) as stockCount
            FROM latest_data
            GROUP BY industry
            ORDER BY momentum DESC
        `;

        const results = await queryBigQuery(query);

        return {
            data: results as any[],
            lastUpdated: Date.now(),
        };

    } catch (error) {
        console.error('Error fetching data from BigQuery:', error);
        return { data: [], lastUpdated: 0 };
    }
}
