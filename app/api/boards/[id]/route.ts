import { NextResponse } from 'next/server';
import { getBoards, getLists, getCards } from '@/lib/google-sheets';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // Note: In Next.js 15, params is a Promise, but let's assume it works synchronously or await it if needed.
    // For standard Next 14/15, awaiting params is safe if it's a promise, or just use it.
    const { id } = await params;

    const boards = await getBoards();
    const board = boards.find((b) => b.id === id);
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const allLists = await getLists();
    const allCards = await getCards();

    const lists = allLists
      .filter((l) => l.boardId === id)
      .sort((a, b) => a.position - b.position)
      .map((list) => ({
        ...list,
        cards: allCards
          .filter((c) => c.listId === list.id)
          .sort((a, b) => a.position - b.position),
      }));

    return NextResponse.json({ ...board, lists });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
