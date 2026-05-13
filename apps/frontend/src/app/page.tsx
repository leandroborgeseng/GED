import Link from 'next/link';

const btnPrimary =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200';

const btnSecondary =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200/80 bg-white/60 px-4 text-sm font-medium text-neutral-900 backdrop-blur-sm transition-all hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 py-16 dark:bg-neutral-950">
      <div className="max-w-lg text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600">GED</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">Aurora Docs</h1>
        <p className="mt-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          Gestão eletrónica de documentos e processos administrativos (PAE). Inicia sessão para aceder ao painel,
          documentos e processos.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/login" className={btnPrimary}>
            Iniciar sessão
          </Link>
          <Link href="/dashboard" className={btnSecondary}>
            Painel
          </Link>
        </div>
      </div>
    </div>
  );
}
