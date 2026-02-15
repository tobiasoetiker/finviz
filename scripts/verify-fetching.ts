import { getSectorPerformance } from '../lib/finviz';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verify() {
    console.log('Verifying sector performance fetching...');
    try {
        const data = await getSectorPerformance();
        console.log('Result:', JSON.stringify(data, null, 2));

        if (data.length > 0) {
            console.log(`Successfully fetched ${data.length} sectors.`);
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
