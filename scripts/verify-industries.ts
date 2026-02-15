import { getIndustryPerformance } from '../lib/finviz';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verify() {
    console.log('Verifying industry performance fetching...');
    try {
        const response = await getIndustryPerformance(undefined, true);
        console.log(`Fetched ${response.data.length} industries.`);

        if (response.data.length > 0) {
            // Show top 5 by capitalization
            const top5 = [...response.data].sort((a: any, b: any) => b.marketCap - a.marketCap).slice(0, 5);
            console.log('Top 5 Industries by Market Cap:');
            console.log(JSON.stringify(top5, null, 2));

            const first = response.data[0];
            if (first.name && typeof first.week === 'number') {
                console.log('Data structure verified.');
            }
        } else {
            console.error('No data returned.');
        }
    } catch (error) {
        console.error('Validation failed:', error);
    }
}

verify();
