import { NextRequest, NextResponse } from 'next/server';
import { adminSessionOk } from '@/lib/auth/adminSession';
import { isSampleUploadConfigured, uploadSampleAsset } from '@/lib/samples';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BYTES = 40 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']);

export async function POST(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Admin login required.' }, { status: 401 });
  }
  if (!isSampleUploadConfigured()) {
    return NextResponse.json(
      { message: 'R2 is not configured. Set R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY.' },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ message: 'Expected multipart form data.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'file is required.' }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { message: 'Only JPEG, PNG, WebP, MP4, or WebM files are allowed.' },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ message: 'File must be under 40MB.' }, { status: 400 });
  }

  const folderRaw = String(form.get('folder') || 'examples');
  const folder = folderRaw === 'before-after' ? 'before-after' : 'examples';

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadSampleAsset({
      buffer,
      contentType: file.type,
      filename: file.name || 'upload.bin',
      folder,
    });
    return NextResponse.json(uploaded);
  } catch (err) {
    console.error('Sample upload error:', err);
    const message = err instanceof Error ? err.message : 'Upload failed.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
