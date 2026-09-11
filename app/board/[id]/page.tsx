import Header from '@/components/Header';
import KanbanBoard from '@/components/KanbanBoard';
import { getBoards, getLists, getCards } from '@/lib/google-sheets';

export default async function BoardPage({ params }: PageProps<'/board/[id]'>) {
  const { id } = await params;
  
  // Fetch data directly for SSR
  const boards = await getBoards();
  const board = boards.find((b) => b.id === id);
  
  if (!board) {
    return (
      <div className="flex-1 flex flex-col">
        <Header />
        <div className="p-8 text-center mt-20">
          <h2 className="text-2xl text-ink-dark">Board not found</h2>
        </div>
      </div>
    );
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

  const boardData = { ...board, lists };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Header />
      <div className="px-8 pt-6 pb-2 shrink-0">
        <h2 className="text-2xl font-semibold text-ink-dark">{board.title}</h2>
      </div>
      <main className="flex-1 overflow-hidden">
        <KanbanBoard initialData={boardData} />
      </main>
    </div>
  );
}
