import Link from 'next/link';
import { connection } from 'next/server';
import Header from '@/components/Header';
import { listBoards } from '@/lib/db/queries';
import type { Board } from '@/lib/db/schema';

export default async function Home() {
  // Without this the board list would be baked in at build time and never change.
  await connection();

  let boards: Board[] = [];
  let failed = false;
  try {
    boards = await listBoards();
  } catch (error) {
    console.error('Erro ao buscar quadros', error);
    failed = true;
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header />
      <main className="flex-1 p-8 md:p-12 max-w-5xl mx-auto w-full">
        <h2 className="text-3xl font-light text-ink-dark mb-8 tracking-tight">Your Workspaces</h2>

        {failed ? (
          <div className="bg-white p-8 rounded-xl border border-red-200 text-center shadow-sm">
            <p className="text-ink-dark/70 mb-2">Não foi possível carregar seus quadros.</p>
            <p className="text-sm text-bronze">Verifique a conexão com o banco de dados.</p>
          </div>
        ) : boards.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-sage text-center shadow-sm">
            <p className="text-ink-dark/70">Você ainda não tem nenhum quadro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {boards.map((board) => (
              <Link
                href={`/board/${board.id}`}
                key={board.id}
                className="bg-white group block p-6 rounded-xl border border-transparent hover:border-sage hover:shadow-md transition-all"
              >
                <h3 className="text-xl font-medium text-ink-dark group-hover:text-bronze transition-colors">
                  {board.title}
                </h3>
                <p className="text-sm text-ink-dark/60 mt-2">Abrir quadro &rarr;</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
