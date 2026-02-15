import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BASE_URL = 'https://elite.finviz.com/export.ashx';
const AUTH = process.env.FINVIZ_API_KEY;
const FILTER = 'cap_midover'; // Default filter from user example

async function probe(viewId: string, name: string) {
    const url = `${BASE_URL}?v=${viewId}&f=${FILTER}&auth=${AUTH}`;
    console.log(`Probing View ${viewId} (${name})...`);
    try {
        const response = await axios.get(url, { responseType: 'stream' });
        let data = '';
        const stream = response.data;

        // Read just the first chunk to get headers
        for await (const chunk of stream) {
            data += chunk.toString();
            if (data.includes('\n')) break;
        }

        const headerLine = data.split('\n')[0];
        console.log(`Headers for v=${viewId}:`);
        console.log(headerLine);
    } catch (err: any) {
        if (err.response) {
            console.error(`Error ${err.response.status}: ${err.response.statusText}`);
            if (err.response.status === 403) console.error("Auth failed or subscription required");
        } else {
            console.error("Error:", err.message);
        }
    }
}

async function main() {
    const views = [
        { id: '161', name: 'Custom' },
    ];

    for (const view of views) {
        await probe(view.id, view.name);
        console.log('Waiting 20 seconds to avoid rate limiting...');
        await new Promise(resolve => setTimeout(resolve, 20000));
    }
}

main();
