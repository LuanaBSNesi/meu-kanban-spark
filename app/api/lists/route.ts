import { NextResponse } from 'next/server';
import { createList } from '@/lib/google-sheets';
import crypto from 'crypto';


export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.title || !body.boardId) {
      return NextResponse.json({ error: 'Missing title or boardId' }, { status: 400 });
    }
    const newList = {
      id: crypto.randomUUID(),
      title: body.title,
      position: body.position || 0,
      boardId: body.boardId,
    };

    await createList(newList);
    return NextResponse.json(newList);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
