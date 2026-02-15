import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
    _request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;
    const filePath = path.join(process.cwd(), 'data', `full_export_${id}.csv`);

    if (!fs.existsSync(filePath)) {
        return new NextResponse('File not found', { status: 404 });
    }

    const fileContent = fs.readFileSync(filePath);

    return new NextResponse(fileContent, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="finviz_full_export_${id}.csv"`,
        },
    });
}
