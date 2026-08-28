import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { message: 'Telegram Stars checkout is temporarily unavailable. Please pay with crypto.' },
    { status: 503 },
  );
}
