'use server';

import { IndustryApiResponse, IndustryRow } from '@/types';
import { revalidatePath, unstable_cache } from 'next/cache';
import { config } from './config';
import { queryBigQuery } from './bigquery';

// Memory cache (optional/secondary now that we verify disk)
let cachedData: IndustryApiResponse | null = null;

export async function refreshMarketData() {
    console.log('Force refreshing market data...');
    revalidatePath('/');
}

export const getAvailableSnapshots = unstable_cache(async () => {
    try {
        const query = `
            SELECT DISTINCT CAST(processed_at AS STRING) as snapshot_date
            FROM \`${config.gcp.projectId}.stock_data.processed_stock_data_history\`
            ORDER BY snapshot_date DESC
            LIMIT 50
        `;

        const rows = await queryBigQuery(query) as { snapshot_date: string | { value: string } }[];

        return rows.map((row) => {
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
}, ['available-snapshots'], { tags: ['finviz-data'], revalidate: 3600 });



export const getAvailableSectors = unstable_cache(async (snapshotId?: string) => {
    try {
        const query = `
            SELECT DISTINCT sector
            FROM \`${config.gcp.projectId}.stock_data.processed_stock_data_history\`
            WHERE ${snapshotId && snapshotId !== 'live' ? `CAST(processed_at AS STRING) = @snapshotId` : "is_current = 'yes'"}
            AND sector IS NOT NULL
            ORDER BY sector
        `;

        const params = snapshotId && snapshotId !== 'live' ? { snapshotId } : undefined;
        const rows = await queryBigQuery(query, params) as { sector: string }[];
        return rows.map((r) => r.sector);
    } catch (e) {
        console.error('Error fetching sectors:', e);
        return [];
    }
}, ['available-sectors'], { tags: ['finviz-data'], revalidate: 3600 });

export const getAvailableIndustries = unstable_cache(async (snapshotId?: string, sector?: string) => {
    try {
        const query = `
            SELECT DISTINCT industry
            FROM \`${config.gcp.projectId}.stock_data.processed_stock_data_history\`
            WHERE ${snapshotId && snapshotId !== 'live' ? `CAST(processed_at AS STRING) = @snapshotId` : "is_current = 'yes'"}
            ${sector ? `AND sector = @sector` : ''}
            AND industry IS NOT NULL
            ORDER BY industry
        `;

        const params: Record<string, string> = {};
        if (snapshotId && snapshotId !== 'live') params.snapshotId = snapshotId;
        if (sector) params.sector = sector;

        const rows = await queryBigQuery(query, Object.keys(params).length > 0 ? params : undefined) as { industry: string }[];
        return rows.map((r) => r.industry);
    } catch (e) {
        console.error('Error fetching industries:', e);
        return [];
    }
}, ['available-industries'], { tags: ['finviz-data'], revalidate: 3600 });

export const getIndustryPerformance = unstable_cache(async (
    snapshotId?: string,
    forceFetch = false,
    groupBy: 'industry' | 'sector' | 'ticker' = 'industry',
    sectorFilter?: string,
    industryFilter?: string
): Promise<IndustryApiResponse> => {
    try {
        console.log(`Fetching ${groupBy} data from BigQuery...${sectorFilter ? ` Filter: ${sectorFilter}` : ''}`);

        // This is a simplified query. In a real scenario, you'd aggregate the processed_stock_data
        // similar to how it was done in the previous implementation, or have a dedicated view/table for it.
        // For now, let's assume we want to aggregate the latest data.

        const groupCol = groupBy === 'sector' ? 'sector' : (groupBy === 'industry' ? 'industry' : 'ticker');
        const params: Record<string, string> = {};

        let query = "";
        if (groupBy === 'ticker') {
            query = `
            WITH latest_data AS (
                SELECT *
                FROM \`${config.gcp.projectId}.stock_data.processed_stock_data_history\`
                WHERE ${snapshotId && snapshotId !== 'live' ? `CAST(processed_at AS STRING) = @snapshotId` : "is_current = 'yes'"}
            ),
            clean_data AS (
                SELECT 
                    industry, sector, ticker, processed_at,
                    SAFE_CAST(REPLACE(performance_week, '%', '') AS FLOAT64) as pct_week,
                    SAFE_CAST(REPLACE(performance_month, '%', '') AS FLOAT64) as pct_month,
                    SAFE_CAST(relative_strength_index_14 AS FLOAT64) as rsi,
                    SAFE_CAST(market_cap AS FLOAT64) * 1000000 as mcap
                FROM latest_data
                WHERE 1=1
                ${sectorFilter ? `AND sector = @sectorFilter` : ''}
                ${industryFilter ? `AND industry = @industryFilter` : ''}
            )
            SELECT 
                ticker as name, sector, industry,
                pct_week as week, pct_month as month, rsi,
                pct_week - (pct_month / 4) as momentum,
                pct_week as weekEqual, pct_month as monthEqual, rsi as rsiEqual,
                pct_week - (pct_month / 4) as momentumEqual,
                SUM(mcap) as marketCap, 1 as stockCount, processed_at, CAST(NULL AS ARRAY<STRUCT<ticker STRING, week FLOAT64>>) as topStocks
            FROM clean_data
            GROUP BY name, sector, industry, week, month, rsi, momentum, weekEqual, monthEqual, rsiEqual, momentumEqual, processed_at
            ORDER BY momentum DESC
            `;
        } else {
            const table = groupBy === 'industry'
                ? `\`${config.gcp.projectId}.stock_data.processed_stock_data_industry_history\``
                : `\`${config.gcp.projectId}.stock_data.processed_stock_data_sector_history\``;

            query = `
                SELECT * 
                FROM ${table}
                WHERE ${snapshotId && snapshotId !== 'live' ? `snapshot_id = @snapshotId` : "is_current = 'yes'"}
                ${sectorFilter && groupBy === 'industry' ? `AND parent_sector = @sectorFilter` : ''}
                ORDER BY momentum DESC
            `;
        }

        if (snapshotId && snapshotId !== 'live') params.snapshotId = snapshotId;
        if (sectorFilter) params.sectorFilter = sectorFilter;
        if (industryFilter) params.industryFilter = industryFilter;

        const results = await queryBigQuery(query, Object.keys(params).length > 0 ? params : undefined) as (IndustryRow & { processed_at: string | { value: string } })[];

        // Use the actual processed_at from the data if available, otherwise fallback
        const firstRow = results.length > 0 ? results[0] : null;
        let dataTimestamp = Date.now();

        if (firstRow && firstRow.processed_at) {
            const val = typeof firstRow.processed_at === 'string' ? firstRow.processed_at : firstRow.processed_at.value;
            dataTimestamp = new Date(val).getTime();
        }

        // Clean data for client serialization
        const cleanResults = results.map((row) => {
            const timestampVal = typeof row.processed_at === 'string' ? row.processed_at : row.processed_at?.value;
            let processedAtTs = null;
            if (timestampVal) {
                processedAtTs = new Date(timestampVal).getTime();
            }

            return {
                ...row,
                processed_at: processedAtTs
            };
        });

        return {
            data: cleanResults as IndustryRow[],
            lastUpdated: dataTimestamp,
        };

    } catch (error) {
        console.error('Error fetching data from BigQuery:', error);
        return { data: [], lastUpdated: 0 };
    }
}, ['industry-performance'], { tags: ['finviz-data'], revalidate: 3600 });
