import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Forward the formData to OCR.space
    const ocrFormData = new FormData();
    ocrFormData.append('file', file);
    ocrFormData.append('apikey', 'K81165445888957'); // Free API key
    ocrFormData.append('language', 'eng');
    ocrFormData.append('scale', 'true');
    ocrFormData.append('OCREngine', '2');

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: ocrFormData,
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[OCR API Route Error]', error);
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
  }
}
