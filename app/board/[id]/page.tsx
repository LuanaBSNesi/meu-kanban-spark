import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import KanbanBoard from '@/components/KanbanBoard';
import { getBoardWithLists } from '@/lib/db/queries';

export default async function BoardPage({ params }: PageProps<'/board/[id]'>) {
  const { id } = await params;
  const board = await getBoardWithLists(id);

  if (!board) notFound();

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Header />
      <main className="flex-1 overflow-hidden flex flex-col">
        <KanbanBoard initialData={board} />
      </main>
    </div>
  );
}
