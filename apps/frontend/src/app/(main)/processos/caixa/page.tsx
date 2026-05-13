'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardDescription, CardHeader, CardTitle, Button } from '@ged/ui';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { PaeProcessListItem } from '@ged/types';
import { Inbox } from 'lucide-react';

type InboxRes = { items: PaeProcessListItem[] };

export default function CaixaPaePage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data, isLoading } = useQuery({
    queryKey: ['pae-inbox', accessToken],
    queryFn: () => apiFetch<InboxRes>('/pae/processes/inbox', { accessToken }),
    enabled: !!accessToken,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Inbox className="h-7 w-7 text-violet-600" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Caixa de entrada</h1>
          <p className="text-sm text-neutral-500">Processos tramitados à sua unidade aguardando ciência.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Pendentes de recebimento</CardTitle>
          <CardDescription>{isLoading ? 'Carregando…' : `${data?.items?.length ?? 0} item(ns)`}</CardDescription>
        </CardHeader>
        <div className="divide-y divide-neutral-100 dark:divide-white/10">
          {(data?.items ?? []).map((p) => (
            <Link
              key={p.id}
              href={`/processos/${p.id}`}
              className="block px-6 py-4 transition hover:bg-neutral-50 dark:hover:bg-white/5"
            >
              <div className="font-medium">
                {p.number}/{p.year} — {p.subject}
              </div>
              <div className="text-xs text-neutral-500">{p.status}</div>
            </Link>
          ))}
          {!isLoading && (data?.items?.length ?? 0) === 0 && (
            <div className="px-6 py-10 text-center text-sm text-neutral-500">Caixa vazia.</div>
          )}
        </div>
      </Card>
      <Link href="/processos">
        <Button variant="secondary">Voltar à lista</Button>
      </Link>
    </div>
  );
}
