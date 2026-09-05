import { NextRequest, NextResponse } from 'next/server';
import { userFromSession } from '@/lib/auth/requestUser';
import { isWavespeedSourceKey, requiresOwnerSession, userOwnsMediaKey } from '@/lib/media/access';
import { verifyMediaSignature } from '@/lib/media/sign';
import { getR2Object, headR2Object } from '@/lib/r2';
import { isOriginalOutputKey } from '@/lib/trial/ingest';
import { AiToolGeneration } from '@/lib/models';
import connectDB from '@/lib/db/mongodb';

// User media keys are content-addressed (uuid/hash) and never mutate, so the
// bytes can be cached by the browser for the signed URL's lifetime. This keeps
// video scrubbing and re-views off the serverless function entirely.
const CACHE_CONTROL = 'private, max-age=86400, immutable';

type AccessResult = { ok: true } | { ok: false; response: NextResponse };

async function authorize(req: NextRequest, key: string): Promise<AccessResult> {
  const exp = Number(req.nextUrl.searchParams.get('exp'));
  const sig = req.nextUrl.searchParams.get('sig') || '';
  if (!verifyMediaSignature(key, exp, sig)) {
    return { ok: false, response: NextResponse.json({ message: 'Forbidden.' }, { status: 403 }) };
  }

  const user = await userFromSession();
  if (requiresOwnerSession(key)) {
    if (!user) {
      return { ok: false, response: NextResponse.json({ message: 'Sign in required.' }, { status: 401 }) };
    }
    if (!(await userOwnsMediaKey(user.id, key))) {
      return { ok: false, response: NextResponse.json({ message: 'Forbidden.' }, { status: 403 }) };
    }
  } else if (!isWavespeedSourceKey(key)) {
    if (!user) {
      return { ok: false, response: NextResponse.json({ message: 'Sign in required.' }, { status: 401 }) };
    }
    if (!(await userOwnsMediaKey(user.id, key))) {
      return { ok: false, response: NextResponse.json({ message: 'Forbidden.' }, { status: 403 }) };
    }
  }

  if (isOriginalOutputKey(key)) {
    try {
      await connectDB();
      const locked = await AiToolGeneration.findOne({ outputKey: key, locked: true }).select('_id').lean();
      if (locked) {
        return { ok: false, response: NextResponse.json({ message: 'Forbidden.' }, { status: 403 }) };
      }
    } catch {
      return { ok: false, response: NextResponse.json({ message: 'Forbidden.' }, { status: 403 }) };
    }
  }

  return { ok: true };
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key') || '';
  const access = await authorize(req, key);
  if (!access.ok) return access.response;

  // Forward the browser Range header so R2 streams only the requested slice.
  const range = req.headers.get('range') || undefined;

  try {
    const obj = await getR2Object(key, range);
    if (!obj.Body) return NextResponse.json({ message: 'Not found.' }, { status: 404 });

    // Stream the body straight through instead of buffering the whole file in
    // function memory. The R2 (S3) SDK body exposes a Web ReadableStream.
    const stream = obj.Body.transformToWebStream();

    const headers = new Headers({
      'Content-Type': obj.ContentType || 'application/octet-stream',
      'Cache-Control': CACHE_CONTROL,
      'Content-Disposition': 'inline',
      'Accept-Ranges': 'bytes',
    });
    if (typeof obj.ContentLength === 'number') {
      headers.set('Content-Length', String(obj.ContentLength));
    }
    // When a Range was requested, R2 responds 206 with a Content-Range header.
    const status = range && obj.ContentRange ? 206 : 200;
    if (obj.ContentRange) headers.set('Content-Range', obj.ContentRange);

    return new NextResponse(stream, { status, headers });
  } catch {
    return NextResponse.json({ message: 'Not found.' }, { status: 404 });
  }
}

// Video players and browsers probe with HEAD before streaming; answer without
// pulling the object body so it stays cheap.
export async function HEAD(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key') || '';
  const access = await authorize(req, key);
  if (!access.ok) return new NextResponse(null, { status: access.response.status });

  try {
    const meta = await headR2Object(key);
    const headers = new Headers({
      'Content-Type': meta.ContentType || 'application/octet-stream',
      'Cache-Control': CACHE_CONTROL,
      'Accept-Ranges': 'bytes',
    });
    if (typeof meta.ContentLength === 'number') {
      headers.set('Content-Length', String(meta.ContentLength));
    }
    return new NextResponse(null, { status: 200, headers });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
