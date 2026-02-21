export const formatPercent = (val: number | null | undefined): string => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
};

export const formatMoney = (val: number | null | undefined): string => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(2)}K`;
    return `$${val.toFixed(2)}`;
};

export const formatCompactNumber = (val: number | null | undefined): string => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    if (val >= 1e9) return `${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
    return val.toString();
};
