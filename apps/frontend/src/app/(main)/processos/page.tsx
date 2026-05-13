'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Card, CardDescription, CardHeader, CardTitle, Button } from '@ged/ui';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { PaeProcessListItem } from '@ged/types';
import { Plus, Filter } from 'lucide-react';

type ListRes = { items: PaeProcessListItem[]; total: number };

export default function ProcessosPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (search) p.set('search', search);
    return p.toString();
  }, [status, search]);

  const { data, isLoading } = useQuery({
    queryKey: ['pae-processes', qs, accessToken],
    queryFn: () => apiFetch<ListRes>(`/pae/processes?${qs}`, { accessToken }),
    enabled: !!accessToken,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Processo administrativo eletrônico</h1>
          <p className="text-sm text-neutral-500">
            Tramitação interna; documentos no Paperless-ngx; metadados e auditoria na plataforma.
          </p>
        </div>
        <Link href="/processos/novo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo processo
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Filter className="h-4 w-4 text-neutral-400" />
          <div>
            <CardTitle className="text-base">Filtros</CardTitle>
            <CardDescription>Status, busca textual, secretaria via API (organizationId)</CardDescription>
          </div>
        </CardHeader>
        <div className="flex flex-wrap gap-3 px-6 pb-6">
          <select
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-neutral-900"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="RASCUNHO">Rascunho</option>
            <option value="ABERTO">Aberto</option>
            <option value="EM_TRAMITACAO">Em tramitação</option>
            <option value="AGUARDANDO_RECEBIMENTO">Aguardando recebimento</option>
            <option value="AGUARDANDO_ASSINATURA">Aguardando assinatura</option>
            <option value="DEVOLVIDO_COMPLEMENTACAO">Devolvido (complementação)</option>
            <option value="CONCLUIDO">Concluído</option>
            <option value="ARQUIVADO">Arquivado</option>
          </select>
          <input
            className="min-w-[200px] flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-neutral-900"
            placeholder="Buscar assunto ou número…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista</CardTitle>
          <CardDescription>
            {isLoading ? 'Carregando…' : `${data?.total ?? 0} processo(s)`}
          </CardDescription>
        </CardHeader>
        <div className="divide-y divide-neutral-100 dark:divide-white/10">
          {(data?.items ?? []).map((p) => (
            <Link
              key={p.id}
              href={`/processos/${p.id}`}
              className="flex flex-col gap-1 px-6 py-4 transition hover:bg-neutral-50 dark:hover:bg-white/5 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="font-medium">
                  {p.number}/{p.year} — {p.subject}
                </div>
                <div className="text-xs text-neutral-500">
                  {p.processType?.name} · {p.currentUnit?.name ?? '—'} · {p.status}
                  {p.interestedParty ? ` · Interessado: ${p.interestedParty}` : ''}
                </div>
              </div>
              <span className="text-xs text-neutral-400">{p.confidentiality}</span>
            </Link>
          ))}
          {!isLoading && (data?.items?.length ?? 0) === 0 && (
            <div className="px-6 py-10 text-center text-sm text-neutral-500">Nenhum processo encontrado.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
