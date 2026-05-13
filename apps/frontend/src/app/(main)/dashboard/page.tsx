'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardDescription, CardHeader, CardTitle } from '@ged/ui';
import { apiFetch } from '@/lib/api';
import type { DashboardSummary } from '@ged/types';
import { useAuthStore } from '@/stores/auth-store';
import { FileText, HardDrive, Users, Workflow } from 'lucide-react';

export default function DashboardPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', accessToken],
    queryFn: () =>
      apiFetch<DashboardSummary>('/dashboard/summary', {
        accessToken,
      }),
    enabled: !!accessToken,
  });

  const stats = [
    { label: 'Documentos', value: data?.documentCount ?? '—', icon: FileText },
    { label: 'Usuários', value: data?.userCount ?? '—', icon: Users },
    { label: 'OCR (proxy)', value: data?.ocrProcessed ?? '—', icon: Workflow },
    {
      label: 'Armazenamento S3',
      value: data?.storage?.configured ? (data.storage.bucketOk ? 'OK' : 'Erro') : 'Off',
      icon: HardDrive,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Olá, {user?.name}</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Visão geral do ambiente — métricas e atividade recente.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{s.label}</p>
                    <p className="mt-2 text-3xl font-semibold tabular-nums">{isLoading ? '…' : s.value}</p>
                  </div>
                  <div className="rounded-2xl bg-neutral-100 p-3 dark:bg-white/10">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Documentos recentes</CardTitle>
            <CardDescription>Origem: Mayan EDMS via API gateway</CardDescription>
          </CardHeader>
          <ul className="space-y-3">
            {(data?.recentDocuments ?? []).length === 0 && (
              <li className="text-sm text-neutral-500">Nenhum documento ou Mayan indisponível.</li>
            )}
            {(data?.recentDocuments ?? []).map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-xl border border-neutral-100 px-3 py-2 text-sm dark:border-white/10"
              >
                <span className="font-medium">{d.label ?? d.file_latest?.filename ?? `Doc #${d.id}`}</span>
                <span className="text-xs text-neutral-400">{d.datetime_created?.slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Linha do tempo</CardTitle>
            <CardDescription>Auditoria recente na plataforma</CardDescription>
          </CardHeader>
          <ul className="space-y-3">
            {(data?.recentActivity as { action: string; createdAt: string; user?: { name?: string } }[])?.map(
              (a, idx) => (
                <li key={idx} className="text-sm text-neutral-600 dark:text-neutral-300">
                  <span className="font-medium text-neutral-900 dark:text-white">{a.action}</span>
                  <span className="text-neutral-400"> · </span>
                  {a.user?.name ?? 'Sistema'}
                  <span className="float-right text-xs text-neutral-400">
                    {new Date(a.createdAt).toLocaleString('pt-BR')}
                  </span>
                </li>
              ),
            ) ?? <li className="text-sm text-neutral-500">Sem eventos.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
