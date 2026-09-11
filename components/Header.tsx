import Link from 'next/link';
import { Layers } from 'lucide-react';
import { connectedAccount } from '@/lib/google/oauth';

export default async function Header() {
  let account: { email: string; scope: string } | null = null;
  try {
    account = await connectedAccount();
  } catch {
    account = null;
  }

  return (
    <header className="bg-creme border-b border-sage-light py-4 px-8 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-3 group">
        <div className="bg-ink-dark text-creme p-2 rounded-md group-hover:bg-bronze transition-colors">
          <Layers size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-widest text-ink-dark leading-none">
            XCNTRX HUB
          </h1>
          <p className="text-xs tracking-[0.2em] text-bronze uppercase mt-1">Business Design</p>
        </div>
      </Link>

      {account ? (
        <span className="text-xs text-ink-dark/60 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-sage" aria-hidden />
          Google conectado: {account.email}
        </span>
      ) : (
        <a
          href="/api/auth/google"
          className="text-sm bg-ink-dark text-creme px-4 py-2 rounded-md hover:bg-bronze transition-colors"
        >
          Conectar Google
        </a>
      )}
    </header>
  );
}
