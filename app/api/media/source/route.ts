import { NextRequest, NextResponse } from 'next/server';
import { verifyMediaSignature } from '@/lib/media/sign';
import { getR2Object } from '@/lib/r2';

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key') || '';
  const exp = Number(req.nextUrl.searchParams.get('exp'));
  const sig = req.nextUrl.searchParams.get('sig') || '';
  if (!verifyMediaSignature(key, exp, sig)) {
    return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });
  }

  try {
    const obj = await getR2Object(key);
    if (!obj.Body) return NextResponse.json({ message: 'Not found.' }, { status: 404 });
    const bytes = await obj.Body.transformToByteArray();
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': obj.ContentType || 'application/octet-stream',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch {
    return NextResponse.json({ message: 'Not found.' }, { status: 404 });
  }
}
