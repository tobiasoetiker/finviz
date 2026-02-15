import { Storage } from '@google-cloud/storage';

const projectId = process.env.GCP_PROJECT_ID;
const bucketName = process.env.GCP_BUCKET_NAME;
const clientEmail = process.env.GCP_CLIENT_EMAIL;
const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n');

let storage: Storage | null = null;

if (projectId && bucketName && clientEmail && privateKey) {
    storage = new Storage({
        projectId,
        credentials: {
            client_email: clientEmail,
            private_key: privateKey,
        },
    });
}

export async function uploadToGCS(filename: string, content: string | Buffer, contentType: string) {
    if (!storage || !bucketName) {
        console.warn('GCS not configured. Skipping upload:', filename);
        return null;
    }

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filename);

    await file.save(content, {
        contentType,
        resumable: false,
    });

    console.log(`Uploaded ${filename} to GCS bucket ${bucketName}`);
    return filename;
}

export async function listGCSFiles(prefix: string) {
    if (!storage || !bucketName) {
        return [];
    }

    const bucket = storage.bucket(bucketName);
    const [files] = await bucket.getFiles({ prefix });

    return files.map(file => ({
        name: file.name,
        updated: file.metadata.updated,
    }));
}

export async function getGCSFileContent(filename: string) {
    if (!storage || !bucketName) {
        throw new Error('GCS not configured');
    }

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filename);

    const [content] = await file.download();
    return content;
}
