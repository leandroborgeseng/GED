'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { AppShell } from '@/components/layout/app-shell';
import { CommandPalette } from '@/components/command-palette';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) router.replace('/login');
  }, [accessToken, router]);

  if (!accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 text-neutral-500 dark:bg-neutral-950">
        Carregando sessão…
      </div>
    );
  }

  return (
    <>
      <AppShell>{children}</AppShell>
      <CommandPalette />
    </>
  );
}
