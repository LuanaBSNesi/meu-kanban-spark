import { NextResponse } from 'next/server';
import { getBoards, createBoard } from '@/lib/google-sheets';

export async function GET() {
  try {
    const boards = await getBoards();
    return NextResponse.json(boards);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.id || !body.title) {
      return NextResponse.json({ error: 'Missing id or title' }, { status: 400 });
    }
    await createBoard({ id: body.id, title: body.title });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
