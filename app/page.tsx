import Header from '@/components/Header';
import Link from 'next/link';

// Use standard Node fetch to API to avoid direct DB calls from server components for simplicity in this demo,
// but actually, we can directly call our lib/google-sheets to get Boards to avoid absolute URL issues in Next.js Server Components.
import { getBoards, type Board } from '@/lib/google-sheets';

export default async function Home() {
  let boards: Board[] = [];
  try {
    boards = await getBoards();
  } catch (error) {
    console.error("Error fetching boards", error);
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header />
      <main className="flex-1 p-8 md:p-12 max-w-5xl mx-auto w-full">
        <h2 className="text-3xl font-light text-ink-dark mb-8 tracking-tight">Your Workspaces</h2>
        
        {boards.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-sage text-center shadow-sm">
            <p className="text-ink-dark/70 mb-4">You don't have any boards yet.</p>
            <p className="text-sm text-bronze">The Google Sheets database might be empty or unconfigured.</p>
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
                <p className="text-sm text-ink-dark/60 mt-2">Open board &rarr;</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
