import Link from 'next/link';
import { Layers } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-creme border-b border-sage-light py-4 px-8 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-3 group">
        <div className="bg-ink-dark text-creme p-2 rounded-md group-hover:bg-bronze transition-colors">
          <Layers size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-widest text-ink-dark leading-none">XCNTRX HUB</h1>
          <p className="text-xs tracking-[0.2em] text-bronze uppercase mt-1">Business Design</p>
        </div>
      </Link>
    </header>
  );
}
