import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getGCSFileContent } from '@/lib/gcs';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const filename = `full_export_${id}.csv`;
    const filePath = path.join(process.cwd(), 'data', filename);

    let fileContent: Buffer;

    // Try local disk first
    if (fs.existsSync(filePath)) {
        fileContent = fs.readFileSync(filePath);
    } else {
        // Fallback to GCS
        try {
            console.log(`Downloading ${filename} from GCS for user download...`);
            fileContent = await getGCSFileContent(filename);
        } catch (e) {
            console.error(`Export ${filename} not found locally or on GCS`);
            return new NextResponse('File not found', { status: 404 });
        }
    }

    return new NextResponse(fileContent as any, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="finviz_full_export_${id}.csv"`,
        },
    });
}
