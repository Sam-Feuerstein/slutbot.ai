import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ message: 'Crypto payment is no longer available. Pay with Telegram Stars.' }, { status: 410 });
}
