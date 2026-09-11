import { NextResponse } from 'next/server';
import { createCard } from '@/lib/google-sheets';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.title || !body.listId) {
      return NextResponse.json({ error: 'Missing title or listId' }, { status: 400 });
    }
    const newCard = {
      id: crypto.randomUUID(),
      title: body.title,
      description: body.description || '',
      is_checked: body.is_checked || false,
      position: body.position || 0,
      listId: body.listId,
    };

    await createCard(newCard);
    return NextResponse.json(newCard);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
