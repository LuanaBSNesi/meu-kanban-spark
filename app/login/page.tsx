import { Layers } from 'lucide-react';

export default function LoginPage() {
  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <div className="bg-white rounded-xl border border-sage p-10 max-w-md w-full text-center shadow-sm">
        <div className="bg-ink-dark text-creme p-3 rounded-md inline-flex mb-6">
          <Layers size={28} />
        </div>
        <h1 className="text-2xl font-bold tracking-widest text-ink-dark">XCNTRX HUB</h1>
        <p className="text-xs tracking-[0.2em] text-bronze uppercase mt-1 mb-8">Business Design</p>

        <p className="text-ink-dark/70 mb-8 text-sm">
          Este quadro é privado. Entre com a conta Google autorizada para continuar.
        </p>

        <a
          href="/api/auth/google"
          className="bg-ink-dark text-creme px-6 py-3 rounded-md hover:bg-bronze transition-colors inline-block font-medium"
        >
          Entrar com Google
        </a>
      </div>
    </main>
  );
}
