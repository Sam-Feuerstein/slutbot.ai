import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { message: 'Credits are billed when generation starts.' },
    { status: 410 },
  );
}
