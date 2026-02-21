export interface GroupPerformance {
  name: string;
  change: number; // Daily change (optional)

  // Market-Cap Weighted
  week: number;
  month: number;
  momentum: number;
  rsi: number; // Market-Cap Weighted RSI

  // Equally Weighted
  weekEqual: number;
  monthEqual: number;
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
