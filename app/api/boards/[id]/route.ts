import { NextResponse } from 'next/server';
import { getBoards, getLists, getCards } from '@/lib/google-sheets';

export async function GET(request: Request, ctx: RouteContext<'/api/boards/[id]'>) {
  try {
    const { id } = await ctx.params;

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
