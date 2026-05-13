'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  Search,
  Settings,
  Users,
  Building2,
  GitBranch,
  Shield,
  UserCircle,
  Sparkles,
  Landmark,
  Inbox,
} from 'lucide-react';
import { cn } from '@ged/ui';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@ged/ui';

const nav = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/documents', label: 'Documentos', icon: FolderOpen },
  { href: '/processos', label: 'Processos (PAE)', icon: Landmark },
  { href: '/processos/caixa', label: 'Caixa PAE', icon: Inbox },
  { href: '/search', label: 'Busca', icon: Search },
  { href: '/workflows', label: 'Workflows', icon: GitBranch },
  { href: '/ai', label: 'IA documental', icon: Sparkles },
  { href: '/users', label: 'Usuários', icon: Users },
  { href: '/companies', label: 'Empresas', icon: Building2 },
  { href: '/audit', label: 'Auditoria', icon: Shield },
  { href: '/settings', label: 'Configurações', icon: Settings },
  { href: '/profile', label: 'Perfil', icon: UserCircle },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const clear = useAuthStore((s) => s.clear);

  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <aside className="hidden w-64 flex-col border-r border-neutral-200/80 bg-white/50 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/50 md:flex">
        <div className="mb-8 px-2">
          <div className="text-xs font-semibold uppercase tracking-widest text-neutral-500">GED</div>
          <div className="text-lg font-semibold tracking-tight">Aurora Docs</div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-neutral-900 text-white shadow-sm dark:bg-white dark:text-neutral-900'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10',
                )}
              >
                <Icon className="h-4 w-4 opacity-80" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Button
          variant="secondary"
          className="mt-4 w-full"
          onClick={() => {
            clear();
            router.push('/login');
          }}
        >
          Sair
        </Button>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-neutral-200/80 bg-white/70 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/70 md:px-8">
          <div className="flex flex-1 items-center gap-3">
            <span className="text-sm text-neutral-500">
              {pathname.replace(/^\//, '').replace(/\//g, ' › ') || 'início'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden h-9 max-w-xs flex-1 items-center rounded-full border border-neutral-200/80 bg-white/60 px-3 text-xs text-neutral-500 dark:border-white/10 dark:bg-white/5 md:flex">
              Busca rápida — ⌘K
            </div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 ring-2 ring-white/30" />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
