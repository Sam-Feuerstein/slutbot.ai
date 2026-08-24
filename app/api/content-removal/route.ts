import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { ContentRemovalRequest } from '@/lib/models';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      contentUrl?: string;
      description?: string;
    };

    const name = body.name?.trim() || '';
    const email = body.email?.trim().toLowerCase() || '';
    const contentUrl = body.contentUrl?.trim() || '';
    const description = body.description?.trim() || '';

    if (!name || !email || !description) {
      return NextResponse.json({ message: 'Name, email, and description are required.' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: 'Please enter a valid email address.' }, { status: 400 });
    }

    await connectDB();
    await ContentRemovalRequest.create({ name, email, contentUrl, description });

    return NextResponse.json({ message: 'Your request has been submitted.' });
  } catch (err) {
    console.error('Content removal request error:', err);
    return NextResponse.json({ message: 'Could not submit your request. Please try again.' }, { status: 500 });
  }
}
