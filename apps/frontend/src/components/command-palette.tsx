'use client';

import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { Search, LayoutDashboard, FolderOpen, Settings, Landmark, Inbox } from 'lucide-react';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  if (!open) return null;

  const go = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[15vh] backdrop-blur-sm">
      <Command
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-900"
        label="Command Menu"
      >
        <div className="flex items-center gap-2 border-b border-neutral-100 px-3 dark:border-white/10">
          <Search className="h-4 w-4 text-neutral-400" />
          <Command.Input
            placeholder="Ir para…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
          />
        </div>
        <Command.List className="max-h-72 overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-neutral-500">Nenhum resultado.</Command.Empty>
          <Command.Group heading="Navegação" className="px-1 py-1 text-xs font-semibold text-neutral-400">
            <Command.Item
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm data-[selected=true]:bg-neutral-100 dark:data-[selected=true]:bg-white/10"
              onSelect={() => go('/dashboard')}
            >
              <LayoutDashboard className="h-4 w-4" /> Painel
            </Command.Item>
            <Command.Item
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm data-[selected=true]:bg-neutral-100 dark:data-[selected=true]:bg-white/10"
              onSelect={() => go('/documents')}
            >
              <FolderOpen className="h-4 w-4" /> Documentos
            </Command.Item>
            <Command.Item
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm data-[selected=true]:bg-neutral-100 dark:data-[selected=true]:bg-white/10"
              onSelect={() => go('/processos')}
            >
              <Landmark className="h-4 w-4" /> Processos (PAE)
            </Command.Item>
            <Command.Item
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm data-[selected=true]:bg-neutral-100 dark:data-[selected=true]:bg-white/10"
              onSelect={() => go('/processos/caixa')}
            >
              <Inbox className="h-4 w-4" /> Caixa PAE
            </Command.Item>
            <Command.Item
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm data-[selected=true]:bg-neutral-100 dark:data-[selected=true]:bg-white/10"
              onSelect={() => go('/settings')}
            >
              <Settings className="h-4 w-4" /> Configurações
            </Command.Item>
          </Command.Group>
        </Command.List>
        <button
          type="button"
          className="w-full border-t border-neutral-100 px-3 py-2 text-center text-xs text-neutral-500 dark:border-white/10"
          onClick={() => setOpen(false)}
        >
          Fechar
        </button>
      </Command>
    </div>
  );
}
