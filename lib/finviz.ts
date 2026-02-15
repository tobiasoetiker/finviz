'use server';

import axios from 'axios';
import { parse } from 'csv-parse/sync';
import { IndustryApiResponse, OverviewRow, PerformanceRow, ValuationRow } from '@/types';
import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';

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
    const filePath = path.join(DATA_DIR, `full_export_${dateStr}.csv`);
    fs.writeFileSync(filePath, csvContent);
    console.log(`Saved full export: full_export_${dateStr}.csv (${mergedRows.length} tickers)`);
}

function saveSnapshot(data: IndustryApiResponse) {
    const dateStr = getDateString(data.lastUpdated);
    const filename = `snapshot_${dateStr}.json`;
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Saved snapshot: ${filename}`);
}

export async function getAvailableSnapshots() {
    if (!fs.existsSync(DATA_DIR)) return [];

    const files = fs.readdirSync(DATA_DIR)
        .filter(f => f.startsWith('snapshot_') && f.endsWith('.json'))
        .map(f => {
            const datePart = f.replace('snapshot_', '').replace('.json', '');

            // Handle both legacy timestamp names and new date-based names
            let timestamp: number;
            if (datePart.includes('-')) {
                // ISO Date YYYY-MM-DD - Parse as UTC to be consistent
                timestamp = new Date(`${datePart}T00:00:00Z`).getTime();
            } else {
                // Legacy timestamp
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

    return files;
}

export async function getIndustryPerformance(snapshotId?: string, forceFetch = false): Promise<IndustryApiResponse> {
    // If a specific snapshot is requested, load it from disk
    if (snapshotId) {
        const filePath = path.join(DATA_DIR, `snapshot_${snapshotId}.json`);
        if (fs.existsSync(filePath)) {
            console.log(`Loading historical snapshot: ${snapshotId}`);
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
    }

    // Default behavior: try to load the LATEST snapshot from disk first
    if (!snapshotId && !forceFetch) {
        if (cachedData) {
            console.log('Returning memory-cached industry data');
            return cachedData;
        }

        const snapshots = await getAvailableSnapshots();
        if (snapshots.length > 0) {
            const latestUid = snapshots[0].id;
            const filePath = path.join(DATA_DIR, `snapshot_${latestUid}.json`);
            console.log(`Loading latest stored snapshot: ${latestUid}`);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            cachedData = data;
            return data;
        }
    }

    const now = Date.now();
    // Only proceed to fetch fresh data if forceFetch is true OR no snapshots exist
    try {
        console.log('Fetching fresh data from Finviz (Manual Refresh)...');

        // Fetch all 6 views with delays to avoid rate limiting
        const overviewData = await fetchCsv<OverviewRow>('111');
        await new Promise(r => setTimeout(r, 2000));

        const valuationData = await fetchCsv<ValuationRow>('121');
        await new Promise(r => setTimeout(r, 2000));

        const financialData = await fetchCsv<any>('131');
        await new Promise(r => setTimeout(r, 2000));

        const performanceData = await fetchCsv<PerformanceRow>('141');
        await new Promise(r => setTimeout(r, 2000));

        const technicalData = await fetchCsv<any>('171');
        await new Promise(r => setTimeout(r, 2000));

        const customData = await fetchCsv<any>('161');

        // Export full CSV
        await exportFullTickerData(
            now,
            overviewData,
            valuationData,
            financialData,
            performanceData,
            technicalData,
            customData
        );

        // Create a map of Ticker -> Performance
        const perfMap = new Map<string, { week: number, month: number }>();
        performanceData.forEach(row => {
            perfMap.set(row.Ticker, {
                week: parsePercent(row['Performance (Week)']),
                month: parsePercent(row['Performance (Month)'])
            });
        });

        // Aggregate by Industry
        const groups = new Map<string, {
            totalCap: number,
            count: number,
            weightedWeek: number,
            weightedMonth: number,
            sumWeek: number,
            sumMonth: number,
            stocks: { ticker: string, week: number }[]
        }>();

        overviewData.forEach(row => {
            const groupName = row.Industry;
            const cap = parseMarketCap(row['Market Cap']);
            const perf = perfMap.get(row.Ticker);

            if (groupName && cap > 0 && perf) {
                if (!groups.has(groupName)) {
                    groups.set(groupName, {
                        totalCap: 0,
                        count: 0,
                        weightedWeek: 0,
                        weightedMonth: 0,
                        sumWeek: 0,
                        sumMonth: 0,
                        stocks: []
                    });
                }
                const group = groups.get(groupName)!;
                group.totalCap += cap;
                group.count += 1;
                group.weightedWeek += perf.week * cap;
                group.weightedMonth += perf.month * cap;
                group.sumWeek += perf.week;
                group.sumMonth += perf.month;
                group.stocks.push({ ticker: row.Ticker, week: perf.week });
            }
        });

        // Calculate averages
        const results: any[] = [];
        groups.forEach((group, name) => {
            const week = group.weightedWeek / group.totalCap;
            const month = group.weightedMonth / group.totalCap;
            const weekEqual = group.sumWeek / group.count;
            const monthEqual = group.sumMonth / group.count;

            // Sort stocks by performance and take top 3
            const topStocks = group.stocks
                .sort((a, b) => b.week - a.week)
                .slice(0, 3);

            results.push({
                name,
                week,
                month,
                momentum: week - month,
                weekEqual,
                monthEqual,
                momentumEqual: weekEqual - monthEqual,
                change: 0,
                volume: 0,
                marketCap: group.totalCap,
                stockCount: group.count,
                topStocks
            });
        });

        const response: IndustryApiResponse = {
            data: results.sort((a, b) => b.momentum - a.momentum),
            lastUpdated: now,
            raw: {
                overview: overviewData,
                performance: performanceData,
                valuation: valuationData
            }
        };

        // Persist every fresh fetch (JSON snapshot)
        saveSnapshot(response);

        cachedData = response;
        return response;

    } catch (error) {
        console.error('Error fetching/processing Finviz data:', error);
        return { data: [], lastUpdated: 0 };
    }
}
