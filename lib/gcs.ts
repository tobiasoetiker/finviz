import { Storage } from '@google-cloud/storage';
import { config } from './config';
import { getGcpCredentials } from './gcloud';

let storage: Storage | null = null;
const creds = getGcpCredentials();

if (creds && config.gcp.bucketName) {
    storage = new Storage(creds);
}

export async function uploadToGCS(filename: string, content: string | Buffer, contentType: string) {
    if (!storage || !config.gcp.bucketName) {
        console.warn('GCS not configured. Skipping upload:', filename);
        return null;
    }

    const bucket = storage.bucket(config.gcp.bucketName);
    const file = bucket.file(filename);

    await file.save(content, {
        contentType,
        resumable: false,
    });

    console.log(`Uploaded ${filename} to GCS bucket ${config.gcp.bucketName}`);
    return filename;
}

export async function listGCSFiles(prefix: string) {
    if (!storage || !config.gcp.bucketName) {
        return [];
    }

    const bucket = storage.bucket(config.gcp.bucketName);
    const [files] = await bucket.getFiles({ prefix });

    return files.map(file => ({
        name: file.name,
        updated: file.metadata.updated,
    }));
}

export async function getGCSFileContent(filename: string) {
    if (!storage || !config.gcp.bucketName) {
        throw new Error('GCS not configured');
    }

    const bucket = storage.bucket(config.gcp.bucketName);
    const file = bucket.file(filename);

    const [content] = await file.download();
    return content;
}
