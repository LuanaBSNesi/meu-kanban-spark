import { NextResponse } from 'next/server';
import { updateList, deleteList } from '@/lib/google-sheets';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // In a real app we'd fetch existing to merge, but we assume client sends full list object
    if (!body.title || body.position === undefined || !body.boardId) {
       return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const updatedList = {
      id,
      title: body.title,
      position: body.position,
      boardId: body.boardId,
    };

    await updateList(updatedList);
    return NextResponse.json(updatedList);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    await deleteList(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
