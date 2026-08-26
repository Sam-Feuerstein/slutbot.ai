import { NextResponse } from 'next/server';
import { quoteStarsForHeaders } from '@/lib/starsGeo';

export async function GET(req: Request) {
  try {
    const quote = await quoteStarsForHeaders(req.headers);
    return NextResponse.json(quote);
  } catch (err) {
    console.error('Stars quote error:', err);
    return NextResponse.json({ message: 'Could not load Stars prices.' }, { status: 500 });
  }
}
