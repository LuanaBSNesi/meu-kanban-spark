import { NextResponse } from 'next/server';
import { updateCard, deleteCard } from '@/lib/google-sheets';

export async function PATCH(request: Request, ctx: RouteContext<'/api/cards/[id]'>) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    
    // We assume client sends the full card object for simplicity
    if (!body.title || body.position === undefined || !body.listId) {
       return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const updatedCard = {
      id,
      title: body.title,
      description: body.description || '',
      is_checked: body.is_checked ?? false,
      position: body.position,
      listId: body.listId,
    };

    await updateCard(updatedCard);
    return NextResponse.json(updatedCard);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, ctx: RouteContext<'/api/cards/[id]'>) {
  try {
    const { id } = await ctx.params;
    await deleteCard(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
