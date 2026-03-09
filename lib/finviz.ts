'use server';

import { IndustryApiResponse, IndustryRow, BollingerSignalRow, BollingerBacktestRow } from '@/types';
import { revalidatePath, unstable_cache } from 'next/cache';
import { config } from './config';
import { queryBigQuery } from './bigquery';

// BigQuery returns all-lowercase column names. This type represents the raw row shape.
interface BigQueryIndustryRow {
    name?: string; industry?: string; sector?: string; ticker?: string;
    processed_at: string | { value: string };
    change?: number; week?: number; month?: number; rsi?: number; momentum?: number;
    changeequal?: number; weekequal?: number; monthequal?: number; rsiequal?: number; momentumequal?: number;
    marketcap?: number; stockcount?: number; topstocks?: { ticker: string; week: number }[];
}

interface BigQueryBollingerRow {
    ticker: string; company?: string; sector?: string; industry?: string;
    price?: number; rsi?: number; marketCap?: number; market_cap_val?: number;
    sma20?: number; stddev20?: number; lowerBand?: number; upperBand?: number;
    distanceFromBand?: number; bandSide?: string;
    processed_at: string | { value: string };
}

interface BigQueryBacktestRow {
    ticker: string; company?: string; sector?: string;
    signalPrice?: number; signalRsi?: number; signalBandSide?: string;
    signalDistanceFromBand?: number; currentPrice?: number;
    returnPct?: number; spyReturnPct?: number; excessReturnPct?: number;
}

function parseTimestamp(val: string | { value: string } | null | undefined): number | null {
    if (!val) return null;
    const str = typeof val === 'string' ? val : val.value;
    return new Date(str).getTime();
}

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

export const getIndustryPerformance = async (
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
                    SAFE_CAST(REPLACE(change, '%', '') AS FLOAT64) as pct_change,
                    SAFE_CAST(relative_strength_index_14 AS FLOAT64) as rsi,
                    SAFE_CAST(market_cap AS FLOAT64) * 1000000 as mcap
                FROM latest_data
                WHERE 1=1
                ${sectorFilter ? `AND sector = @sectorFilter` : ''}
                ${industryFilter ? `AND industry = @industryFilter` : ''}
            )
            SELECT 
                ticker as name, sector, industry,
                pct_change as change, pct_week as week, pct_month as month, rsi,
                pct_week - (pct_month / 4) as momentum,
                pct_change as changeEqual, pct_week as weekEqual, pct_month as monthEqual, rsi as rsiEqual,
                pct_week - (pct_month / 4) as momentumEqual,
                SUM(mcap) as marketCap, 1 as stockCount, processed_at, CAST(NULL AS ARRAY<STRUCT<ticker STRING, week FLOAT64>>) as topStocks
            FROM clean_data
            GROUP BY name, sector, industry, change, week, month, rsi, momentum, changeEqual, weekEqual, monthEqual, rsiEqual, momentumEqual, processed_at
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

        const results = await queryBigQuery<BigQueryIndustryRow>(query, Object.keys(params).length > 0 ? params : undefined);

        // Use the actual processed_at from the data if available, otherwise fallback
        const firstRow = results.length > 0 ? results[0] : null;
        const dataTimestamp = parseTimestamp(firstRow?.processed_at) ?? Date.now();

        // Map BigQuery lowercase columns to camelCase IndustryRow
        const cleanResults = results.map((row) => ({
            name: row.name || (groupBy === 'industry' ? row.industry : row.sector) || '',
            change: row.change ?? 0,
            week: row.week ?? 0,
            month: row.month ?? 0,
            rsi: row.rsi ?? 0,
            momentum: row.momentum ?? 0,
            changeEqual: row.changeequal ?? 0,
            weekEqual: row.weekequal ?? 0,
            monthEqual: row.monthequal ?? 0,
            rsiEqual: row.rsiequal ?? 0,
            momentumEqual: row.momentumequal ?? 0,
            volume: 0,
            marketCap: row.marketcap ?? 0,
            stockCount: row.stockcount ?? 0,
            topStocks: row.topstocks ?? [],
        }));

        return {
            data: cleanResults as IndustryRow[],
            lastUpdated: dataTimestamp,
        };

    } catch (error) {
        console.error('Error fetching data from BigQuery:', error);
        throw error;
    }
};

export const getBollingerOversoldStocks = async (snapshotId?: string, rsiThreshold: number = 30): Promise<BollingerSignalRow[]> => {
    try {
        console.log(`Fetching Bollinger signals from BigQuery... snapshotId: ${snapshotId || 'live'}`);

        const params: Record<string, string | number> = {};
        if (snapshotId && snapshotId !== 'live') params.snapshotId = snapshotId;
        params.rsiThreshold = rsiThreshold;

        const query = `
        WITH RecentSnapshots AS (
            -- Only fetch the last 25 snapshots (enough for 20-period SMA + buffer)
            SELECT DISTINCT processed_at
            FROM \`${config.gcp.projectId}.stock_data.processed_stock_data_history\`
            ${snapshotId && snapshotId !== 'live'
                ? `WHERE CAST(processed_at AS STRING) <= @snapshotId`
                : ''}
            ORDER BY processed_at DESC
            LIMIT 25
        ),
        HistoricalPrices AS (
            SELECT
                h.ticker, h.company, h.sector, h.industry, h.processed_at, h.is_current, h.relative_strength_index_14 as rsi,
                SAFE_CAST(h.price AS FLOAT64) as price_val,
                SAFE_CAST(h.market_cap AS FLOAT64) * 1000000 as market_cap_val
            FROM \`${config.gcp.projectId}.stock_data.processed_stock_data_history\` h
            INNER JOIN RecentSnapshots rs ON h.processed_at = rs.processed_at
            WHERE h.ticker IS NOT NULL AND h.price IS NOT NULL
        ),
        CalculatedBands AS (
            SELECT
                *,
                AVG(price_val) OVER (
                    PARTITION BY ticker
                    ORDER BY processed_at
                    ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
                ) as sma20,
                STDDEV_SAMP(price_val) OVER (
                    PARTITION BY ticker
                    ORDER BY processed_at
                    ROWS BETWEEN 19 PRECEDING AND CURRENT ROW
                ) as stddev20
            FROM HistoricalPrices
        ),
        Signals AS (
            SELECT 
                ticker, company, sector, industry, price_val as price, rsi, market_cap_val as marketCap,
                sma20, stddev20, 
                (sma20 - 2 * stddev20) as lowerBand,
                (sma20 + 2 * stddev20) as upperBand,
                processed_at,
                is_current
            FROM CalculatedBands
            WHERE stddev20 IS NOT NULL
        ),
        FilteredSignals AS (
            SELECT * FROM Signals
            WHERE ${snapshotId && snapshotId !== 'live' ? 'CAST(processed_at AS STRING) = @snapshotId' : "is_current = 'yes'"}
              AND rsi < @rsiThreshold
              AND (price < lowerBand OR price > upperBand)
        )
        SELECT 
            *,
            CASE WHEN price < lowerBand THEN 'lower' ELSE 'upper' END as bandSide,
            CASE 
                WHEN price < lowerBand THEN ((lowerBand - price) / lowerBand) * 100
                ELSE ((price - upperBand) / upperBand) * 100
            END as distanceFromBand
        FROM FilteredSignals
        ORDER BY distanceFromBand DESC
        `;

        const results = await queryBigQuery(query, Object.keys(params).length > 0 ? params : undefined) as any[];

        return results.map(row => {
            const timestampVal = typeof row.processed_at === 'string' ? row.processed_at : row.processed_at?.value;
            let processedAtTs = 0;
            if (timestampVal) {
                processedAtTs = new Date(timestampVal).getTime();
            }

            return {
                ticker: row.ticker,
                company: row.company || row.ticker,
                sector: row.sector || 'Unknown',
                industry: row.industry || 'Unknown',
                price: row.price || 0,
                rsi: row.rsi || 0,
                marketCap: row.marketCap || 0,
                sma20: row.sma20 || 0,
                stddev20: row.stddev20 || 0,
                lowerBand: row.lowerBand || 0,
                upperBand: row.upperBand || 0,
                distanceFromBand: row.distanceFromBand || 0,
                bandSide: row.bandSide as 'lower' | 'upper',
                processedAt: processedAtTs
            };
        });

    } catch (error) {
        console.error('Error fetching Bollinger signals:', error);
        throw error;
    }
};

export const getBollingerBacktest = async (currentSnapshotId?: string, rsiThreshold: number = 30, lookbackDays: number = 1): Promise<{ rows: BollingerBacktestRow[]; signalDate: string; currentDate: string }> => {
    try {
        console.log(`Fetching Bollinger backtest (${lookbackDays}d) from BigQuery...`);

        // Step 1: Get recent snapshot dates, deduplicating by trading day (weekends have same prices)
        const snapshotQuery = `
            WITH snapshots AS (
                SELECT
                    CAST(processed_at AS STRING) as snapshot_date,
                    MAX(CASE WHEN ticker = 'AAPL' THEN price END) as sample_price
                FROM \`${config.gcp.projectId}.stock_data.processed_stock_data_history\`
                ${currentSnapshotId && currentSnapshotId !== 'live'
                    ? `WHERE CAST(processed_at AS STRING) <= @currentSnapshotId`
                    : ''}
                GROUP BY snapshot_date
                ORDER BY snapshot_date DESC
                LIMIT 20
            )
            SELECT snapshot_date, sample_price FROM snapshots ORDER BY snapshot_date DESC
        `;

        const snapshotParams = (currentSnapshotId && currentSnapshotId !== 'live')
            ? { currentSnapshotId }
            : undefined;

        const snapshotRows = await queryBigQuery(snapshotQuery, snapshotParams) as { snapshot_date: string | { value: string }; sample_price: string | null }[];

        if (snapshotRows.length < 2) {
            return { rows: [], signalDate: '', currentDate: '' };
        }

        // Deduplicate snapshots to unique trading days (different sample prices)
        const getVal = (row: typeof snapshotRows[number]) => typeof row.snapshot_date === 'string' ? row.snapshot_date : row.snapshot_date.value;
        const tradingDays: string[] = [getVal(snapshotRows[0])];
        let lastPrice = snapshotRows[0].sample_price;

        for (let i = 1; i < snapshotRows.length; i++) {
            if (snapshotRows[i].sample_price !== lastPrice) {
                tradingDays.push(getVal(snapshotRows[i]));
                lastPrice = snapshotRows[i].sample_price;
            }
        }

        // Need at least lookbackDays + 1 trading days (current + N days back)
        const clampedLookback = Math.min(lookbackDays, tradingDays.length - 1);
        if (clampedLookback < 1) {
            return { rows: [], signalDate: '', currentDate: '' };
        }

        const currentDate = tradingDays[0];
        const previousDate = tradingDays[clampedLookback];

        console.log(`Bollinger backtest: comparing ${previousDate} -> ${currentDate} (${clampedLookback} trading days)`);

        // Step 2: Find stocks that had Bollinger signals on the previous date and their current prices
        // Use market-cap-weighted average return of all stocks as market proxy (since SPY/ETFs aren't in the dataset)
        const backtestQuery = `
        WITH RecentSnapshots AS (
            -- Only fetch the last 25 snapshots up to previousDate (enough for 20-period SMA)
            SELECT DISTINCT processed_at
            FROM \`${config.gcp.projectId}.stock_data.processed_stock_data_history\`
            WHERE CAST(processed_at AS STRING) <= @previousDate
            ORDER BY processed_at DESC
            LIMIT 25
        ),
        AllHistory AS (
            SELECT
                h.ticker,
                SAFE_CAST(h.price AS FLOAT64) as price_val,
                h.processed_at
            FROM \`${config.gcp.projectId}.stock_data.processed_stock_data_history\` h
            INNER JOIN RecentSnapshots rs ON h.processed_at = rs.processed_at
            WHERE h.ticker IS NOT NULL AND h.price IS NOT NULL
        ),
        PrevSnapshot AS (
            SELECT
                ticker, company, sector, industry,
                SAFE_CAST(price AS FLOAT64) as price_val,
                SAFE_CAST(relative_strength_index_14 AS FLOAT64) as rsi,
                SAFE_CAST(market_cap AS FLOAT64) * 1000000 as market_cap_val
            FROM \`${config.gcp.projectId}.stock_data.processed_stock_data_history\`
            WHERE CAST(processed_at AS STRING) = @previousDate
              AND ticker IS NOT NULL AND price IS NOT NULL
        ),
        PrevBands AS (
            SELECT
                p.ticker, p.company, p.sector, p.price_val, p.rsi, p.market_cap_val,
                AVG(h.price_val) as sma20,
                STDDEV_SAMP(h.price_val) as stddev20
            FROM PrevSnapshot p
            JOIN AllHistory h ON p.ticker = h.ticker
            GROUP BY p.ticker, p.company, p.sector, p.price_val, p.rsi, p.market_cap_val
            HAVING COUNT(h.price_val) >= 10
        ),
        PrevSignals AS (
            SELECT
                ticker, company, sector, price_val as signalPrice, rsi as signalRsi,
                CASE WHEN price_val < (sma20 - 2 * stddev20) THEN 'lower' ELSE 'upper' END as bandSide,
                CASE
                    WHEN price_val < (sma20 - 2 * stddev20) THEN (((sma20 - 2 * stddev20) - price_val) / (sma20 - 2 * stddev20)) * 100
                    ELSE ((price_val - (sma20 + 2 * stddev20)) / (sma20 + 2 * stddev20)) * 100
                END as distanceFromBand
            FROM PrevBands
            WHERE rsi < @rsiThreshold
              AND (price_val < (sma20 - 2 * stddev20) OR price_val > (sma20 + 2 * stddev20))
              AND stddev20 IS NOT NULL
        ),
        CurrentSnapshot AS (
            SELECT
                ticker,
                SAFE_CAST(price AS FLOAT64) as currentPrice,
                SAFE_CAST(relative_strength_index_14 AS FLOAT64) as currentRsi,
                SAFE_CAST(market_cap AS FLOAT64) * 1000000 as market_cap_val
            FROM \`${config.gcp.projectId}.stock_data.processed_stock_data_history\`
            WHERE CAST(processed_at AS STRING) = @currentDate
              AND ticker IS NOT NULL AND price IS NOT NULL
        ),
        MarketReturn AS (
            SELECT
                SAFE_DIVIDE(
                    SUM((c.currentPrice - p.price_val) / p.price_val * p.market_cap_val),
                    SUM(p.market_cap_val)
                ) * 100 as marketReturn
            FROM PrevSnapshot p
            JOIN CurrentSnapshot c ON p.ticker = c.ticker
            WHERE p.price_val > 0 AND p.market_cap_val > 0
        )
        SELECT
            s.ticker, s.company, s.sector,
            s.signalPrice, s.signalRsi, s.bandSide as signalBandSide,
            s.distanceFromBand as signalDistanceFromBand,
            c.currentPrice, c.currentRsi,
            (c.currentPrice - s.signalPrice) / s.signalPrice * 100 as returnPct,
            COALESCE(m.marketReturn, 0) as spyReturnPct,
            (c.currentPrice - s.signalPrice) / s.signalPrice * 100 - COALESCE(m.marketReturn, 0) as excessReturnPct
        FROM PrevSignals s
        JOIN CurrentSnapshot c ON s.ticker = c.ticker
        CROSS JOIN MarketReturn m
        ORDER BY returnPct DESC
        `;

        const backtestParams: Record<string, string | number> = {
            previousDate,
            currentDate,
            rsiThreshold
        };

        const results = await queryBigQuery(backtestQuery, backtestParams) as any[];

        console.log(`Bollinger backtest: found ${results.length} results`);

        const rows: BollingerBacktestRow[] = results.map(row => ({
            ticker: row.ticker,
            company: row.company || row.ticker,
            sector: row.sector || 'Unknown',
            signalPrice: row.signalPrice || 0,
            signalRsi: row.signalRsi || 0,
            signalBandSide: row.signalBandSide as 'lower' | 'upper',
            signalDistanceFromBand: row.signalDistanceFromBand || 0,
            currentPrice: row.currentPrice || 0,
            currentRsi: row.currentRsi || 0,
            returnPct: row.returnPct || 0,
            spyReturnPct: row.spyReturnPct || 0,
            excessReturnPct: row.excessReturnPct || 0,
            signalDate: previousDate
        }));

        return { rows, signalDate: previousDate, currentDate };

    } catch (error) {
        console.error('Error fetching Bollinger backtest:', error);
        throw error;
    }
};
