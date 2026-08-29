import { NextRequest, NextResponse } from 'next/server';
import { userFromSession } from '@/lib/auth/requestUser';
import { isWavespeedSourceKey, requiresOwnerSession, userOwnsMediaKey } from '@/lib/media/access';
import { verifyMediaSignature } from '@/lib/media/sign';
import { getR2Object } from '@/lib/r2';
import { isOriginalOutputKey } from '@/lib/trial/ingest';
import { AiToolGeneration } from '@/lib/models';
import connectDB from '@/lib/db/mongodb';

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key') || '';
  const exp = Number(req.nextUrl.searchParams.get('exp'));
  const sig = req.nextUrl.searchParams.get('sig') || '';
  if (!verifyMediaSignature(key, exp, sig)) {
    return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });
  }

  const user = await userFromSession();
  if (requiresOwnerSession(key)) {
    if (!user) {
      return NextResponse.json({ message: 'Sign in required.' }, { status: 401 });
    }
    if (!(await userOwnsMediaKey(user.id, key))) {
      return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });
    }
  } else if (!isWavespeedSourceKey(key)) {
    if (!user) {
      return NextResponse.json({ message: 'Sign in required.' }, { status: 401 });
    }
    if (!(await userOwnsMediaKey(user.id, key))) {
      return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });
    }
  }

  if (isOriginalOutputKey(key)) {
    try {
      await connectDB();
      const locked = await AiToolGeneration.findOne({ outputKey: key, locked: true }).select('_id').lean();
      if (locked) {
        return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });
    }
  }

  try {
    const obj = await getR2Object(key);
    if (!obj.Body) return NextResponse.json({ message: 'Not found.' }, { status: 404 });
    const bytes = await obj.Body.transformToByteArray();
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': obj.ContentType || 'application/octet-stream',
        'Cache-Control': 'private, no-store',
        'Content-Disposition': 'inline',
      },
    });
  } catch {
    return NextResponse.json({ message: 'Not found.' }, { status: 404 });
  }
}
