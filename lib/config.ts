import { z } from 'zod';

const envSchema = z.object({
    FINVIZ_API_URL: z.string().url().default('https://elite.finviz.com/export.ashx'),
    FINVIZ_API_KEY: z.string().min(1, "FINVIZ_API_KEY is required"),
    GCP_PROJECT_ID: z.string().min(1, "GCP_PROJECT_ID is required"),
    GCP_BUCKET_NAME: z.string().optional(),
    GCP_CLIENT_EMAIL: z.string().email("GCP_CLIENT_EMAIL must be a valid email"),
    GCP_PRIVATE_KEY: z.string().min(1, "GCP_PRIVATE_KEY is required"),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

// Since we use this in the browser too (e.g. Next.js components), we only want to crash 
// if we run this on the server and are missing keys.
const validateEnv = () => {
    try {
        const parsed = envSchema.parse(process.env);
        return {
            finviz: {
                apiUrl: parsed.FINVIZ_API_URL,
                apiKey: parsed.FINVIZ_API_KEY,
            },
            gcp: {
                projectId: parsed.GCP_PROJECT_ID,
                bucketName: parsed.GCP_BUCKET_NAME,
                clientEmail: parsed.GCP_CLIENT_EMAIL,
                privateKey: parsed.GCP_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"|"$/g, ''),
            },
            isProduction: parsed.NODE_ENV === 'production',
        };
    } catch (error) {
        if (typeof window === 'undefined') {
            // Only throw error on the server
            console.error('❌ Invalid environment variables:', error);
            throw new Error('Invalid environment variables. Check your .env.local file.');
        }
        // Return dummy config for client-side to prevent crashing during build/hydration
        // Client-side code should not be accessing these secrets anyway.
        return {
            finviz: { apiUrl: '', apiKey: '' },
            gcp: { projectId: '', clientEmail: '', privateKey: '' },
            isProduction: false
        };
    }
};

export const config = validateEnv();

export function validateConfig() {
    // Left for backwards compatibility, the actual validation happens lazily 
    // when config is imported via validateEnv()
}
