export type PerformanceTimeFrame = 'change' | 'week' | 'month' | 'quarter';
export type MomentumPreset = 'daily' | 'weekly' | 'monthly';

export interface GroupPerformance {
  name: string;
  change: number; // Daily change

  // Market-Cap Weighted
  week: number;
  month: number;
  quarter: number;
  momentum: number;
  rsi: number; // Market-Cap Weighted RSI

  // Equally Weighted
  weekEqual: number;
  monthEqual: number;
  quarterEqual: number;
  momentumEqual: number;
  rsiEqual: number; // Equal Weighted RSI

  volume: number;
  marketCap: number; // Total Market Cap (aggregated)
  stockCount: number; // Number of stocks in this group
  topStocks: { ticker: string; week: number }[]; // Top 3 stocks by weekly performance
}

export type IndustryRow = GroupPerformance;

export interface OverviewRow {
  Ticker: string;
  Sector: string;
  Industry: string;
  'Market Cap': string;
}

export interface PerformanceRow {
  Ticker: string;
  'Performance (Week)': string;
  'Performance (Month)': string;
}

export interface ValuationRow {
  Ticker: string;
  'P/E': string;
  'Forward P/E': string;
  'PEG': string;
  'P/S': string;
  'P/B': string;
  'P/Cash': string;
  'P/Free Cash Flow': string;
}

export interface TechnicalRow {
  Ticker: string;
  'RSI (14)': string;
  'SMA20': string;
  'SMA50': string;
  'SMA200': string;
  '52W High': string;
  '52W Low': string;
}

export interface CustomRow {
  Ticker: string;
  [key: string]: string; // Allow for custom columns based on user views
}

export interface IndustryApiResponse {
  data: GroupPerformance[];
  lastUpdated: number;
  raw?: {
    overview: OverviewRow[];
    performance: PerformanceRow[];
    valuation: ValuationRow[];
  };
}

export type SectorData = GroupPerformance[];
export type IndustryData = GroupPerformance[];

export interface BollingerSignalRow {
  ticker: string;
  company: string;
  sector: string;
  industry: string;
  price: number;
  rsi: number;
  marketCap: number;
  sma20: number;
  stddev20: number;
  lowerBand: number;
  upperBand: number;
  distanceFromBand: number;
  bandSide: 'lower' | 'upper';
  processedAt: number;
  signalDate: string;
}

export interface BollingerBacktestRow {
  ticker: string;
  company: string;
  sector: string;
  signalPrice: number;
  signalRsi: number;
  signalBandSide: 'lower' | 'upper';
  signalDistanceFromBand: number;
  currentPrice: number;
  currentRsi: number;
  returnPct: number;
  spyReturnPct: number;
  excessReturnPct: number;
  signalDate: string;
  marketCap: number;
}

export interface VolatileStockRow {
  name: string;          // Ticker, industry, or sector name depending on groupBy
  company: string;
  sector: string;
  industry: string;
  price: number;
  marketCap: number;
  atrPct: number;        // Average |daily change %| over N days
  latestChange: number;  // Most recent day's change %
  avgChange: number;     // Average daily change % (signed) over N days
  maxMove: number;       // Largest single-day |change| in period
  minChange: number;     // Most negative change in period
  maxChange: number;     // Most positive change in period
  daysCounted: number;   // How many trading days were used
  stockCount: number;    // Number of stocks (1 for individual, N for groups)
}

export interface VolatilityBacktestRow {
  ticker: string;
  company: string;
  sector: string;
  signalPrice: number;
  signalAtrPct: number;
  currentPrice: number;
  returnPct: number;
  spyReturnPct: number;
  excessReturnPct: number;
  signalDate: string;
  marketCap: number;
}
