import { getIndustryPerformance } from '../lib/finviz';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verify() {
    console.log('Verifying industry performance fetching...');
    try {
        const response = await getIndustryPerformance();
        const data = response.data;
        console.log('Result count:', data.length);

        if (data.length > 0) {
            console.log(`Successfully fetched ${data.length} industries.`);
            const first = data[0];
            if (first.name && typeof first.week === 'number' && typeof first.momentum === 'number') {
                console.log('Data structure verified.');
            } else {
                console.error('Data structure invalid:', first);
            }
        } else {
            console.error('No data returned.');
        }
    } catch (error) {
        console.error('Validation failed:', error);
    }
}

verify();
