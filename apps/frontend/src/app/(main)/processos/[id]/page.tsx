'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Card, CardDescription, CardHeader, CardTitle, Button } from '@ged/ui';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

type Movement = {
  id: string;
  kind: string;
  summary?: string | null;
  dispatchText?: string | null;
  createdAt: string;
  acknowledgedAt?: string | null;
  fromUnit?: { name: string; code: string } | null;
  toUnit?: { name: string; code: string } | null;
  createdBy?: { name: string };
};

type ProcessDetail = {
  id: string;
  number: string;
  year: number;
  subject: string;
  status: string;
  interestedParty?: string | null;
  confidentiality: string;
  archivedAt?: string | null;
  movements: Movement[];
  documents: { id: string; title: string; sha256: string; paperlessDocumentId: string }[];
  signatures: {
    id: string;
    status: string;
    method: string;
    userId: string;
    user?: { name: string };
  }[];
  comments: { id: string; body: string; createdAt: string; user: { name: string } }[];
  deadlines: { id: string; label: string; dueAt: string; fulfilledAt?: string | null }[];
};

export default function ProcessoDetalhePage() {
  const params = useParams();
  const id = params.id as string;
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [toUnitId, setToUnitId] = useState('');
  const [despacho, setDespacho] = useState('');
  const [certPem, setCertPem] = useState('');
  const [sigB64, setSigB64] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['pae-process', id, accessToken],
    queryFn: () => apiFetch<ProcessDetail>(`/pae/processes/${id}`, { accessToken }),
    enabled: !!accessToken && !!id,
  });

  const pendingA1Id =
    data?.signatures?.find(
      (s) => s.status === 'PENDENTE' && s.userId === user?.id && s.method === 'ICP_BRASIL',
    )?.id;

  const { data: a1Payload } = useQuery({
    queryKey: ['a1-payload', id, pendingA1Id, accessToken],
    queryFn: () =>
      apiFetch<{ payloadUtf8: string; hint: string; documentSha256: string | null }>(
        `/pae/processes/${id}/assinaturas/${pendingA1Id}/payload-a1`,
        { accessToken },
      ),
    enabled: !!accessToken && !!id && !!pendingA1Id,
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['pae-process', id] });

  const ciencia = useMutation({
    mutationFn: () =>
      apiFetch(`/pae/processes/${id}/ciencia`, { method: 'POST', accessToken }),
    onSuccess: () => {
      toast.success('Recebimento registrado');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tramitar = useMutation({
    mutationFn: () =>
      apiFetch(`/pae/processes/${id}/tramitar`, {
        method: 'POST',
        accessToken,
        body: JSON.stringify({ toUnitId, summary: 'Tramitação' }),
      }),
    onSuccess: () => {
      toast.success('Tramitado');
      setToUnitId('');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const despachoMut = useMutation({
    mutationFn: () =>
      apiFetch(`/pae/processes/${id}/despacho`, {
        method: 'POST',
        accessToken,
        body: JSON.stringify({ text: despacho }),
      }),
    onSuccess: () => {
      toast.success('Despacho registrado');
      setDespacho('');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const arquivar = useMutation({
    mutationFn: () =>
      apiFetch(`/pae/processes/${id}/arquivar`, {
        method: 'POST',
        accessToken,
        body: JSON.stringify({ reason: 'Arquivamento pela interface' }),
      }),
    onSuccess: () => {
      toast.success('Arquivado');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assinar = useMutation({
    mutationFn: (signatureId: string) =>
      apiFetch(`/pae/processes/${id}/assinar/${signatureId}`, { method: 'POST', accessToken }),
    onSuccess: () => {
      toast.success('Assinatura simples registrada');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assinarA1 = useMutation({
    mutationFn: ({ signatureId, body }: { signatureId: string; body: { certificatePem: string; signatureBase64: string } }) =>
      apiFetch(`/pae/processes/${id}/assinar-a1/${signatureId}`, {
        method: 'POST',
        accessToken,
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success('Assinatura A1 registrada');
      setCertPem('');
      setSigB64('');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return <div className="text-sm text-neutral-500">Carregando processo…</div>;
  }

  const pendingSimple = data.signatures?.find(
    (s) => s.status === 'PENDENTE' && s.userId === user?.id && s.method === 'SIMPLES',
  );
  const pendingA1 = data.signatures?.find(
    (s) => s.status === 'PENDENTE' && s.userId === user?.id && s.method === 'ICP_BRASIL',
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-600">PAE</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {data.number}/{data.year}
        </h1>
        <p className="text-neutral-600 dark:text-neutral-300">{data.subject}</p>
        <p className="mt-2 text-xs text-neutral-500">
          Status: {data.status} · Sigilo: {data.confidentiality}
          {data.interestedParty ? ` · Interessado: ${data.interestedParty}` : ''}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Linha do tempo</CardTitle>
            <CardDescription>Tramitação, despachos, ciência e anexos</CardDescription>
          </CardHeader>
          <div className="relative space-y-0 px-6 pb-6">
            <div className="absolute left-9 top-0 bottom-0 w-px bg-neutral-200 dark:bg-white/10" />
            {data.movements.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="relative flex gap-4 pb-6 pl-2"
              >
                <div className="relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full bg-violet-500 ring-4 ring-white dark:ring-neutral-950" />
                <div className="min-w-0 flex-1 rounded-xl border border-neutral-100 bg-neutral-50/80 p-3 text-sm dark:border-white/10 dark:bg-white/5">
                  <div className="font-medium text-neutral-900 dark:text-white">{m.kind}</div>
                  <div className="text-xs text-neutral-500">
                    {new Date(m.createdAt).toLocaleString('pt-BR')} · {m.createdBy?.name}
                  </div>
                  {m.summary && <p className="mt-2 text-neutral-700 dark:text-neutral-200">{m.summary}</p>}
                  {m.dispatchText && (
                    <p className="mt-2 rounded-lg bg-white/80 p-2 text-neutral-800 dark:bg-neutral-900/80">
                      {m.dispatchText}
                    </p>
                  )}
                  <div className="mt-2 text-xs text-neutral-500">
                    {m.fromUnit ? `${m.fromUnit.name}` : '—'} → {m.toUnit ? `${m.toUnit.name}` : '—'}
                    {m.acknowledgedAt ? ` · Ciência ${new Date(m.acknowledgedAt).toLocaleString('pt-BR')}` : ''}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ações</CardTitle>
              <CardDescription>Fluxo SEI-like simplificado</CardDescription>
            </CardHeader>
            <div className="flex flex-col gap-3 px-6 pb-6">
              <Button variant="secondary" onClick={() => ciencia.mutate()} disabled={ciencia.isPending}>
                Registrar ciência (recebimento)
              </Button>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-neutral-500">ID da unidade destino</label>
                <input
                  className="rounded-lg border border-neutral-200 px-2 py-1 text-xs dark:border-white/10 dark:bg-neutral-900"
                  placeholder="cuid da Unit"
                  value={toUnitId}
                  onChange={(e) => setToUnitId(e.target.value)}
                />
                <Button size="sm" onClick={() => tramitar.mutate()} disabled={!toUnitId || tramitar.isPending}>
                  Tramitar
                </Button>
              </div>
              <textarea
                className="min-h-[72px] rounded-xl border border-neutral-200 p-2 text-sm dark:border-white/10 dark:bg-neutral-900"
                placeholder="Texto do despacho"
                value={despacho}
                onChange={(e) => setDespacho(e.target.value)}
              />
              <Button size="sm" variant="secondary" onClick={() => despachoMut.mutate()} disabled={!despacho}>
                Registrar despacho
              </Button>
              {pendingSimple && (
                <Button onClick={() => assinar.mutate(pendingSimple.id)} disabled={assinar.isPending}>
                  Assinar (eletrônica simples)
                </Button>
              )}
              {pendingA1 && (
                <div className="space-y-2 rounded-xl border border-violet-200/80 bg-violet-50/50 p-3 dark:border-violet-900/40 dark:bg-violet-950/20">
                  <p className="text-xs font-medium text-violet-900 dark:text-violet-100">
                    Assinatura obrigatória com certificado A1
                  </p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    {a1Payload?.hint ??
                      'Carregue o texto exato a assinar (payload) e assine com a chave privada do certificado; envie PEM + Base64.'}
                  </p>
                  {a1Payload?.payloadUtf8 && (
                    <pre className="max-h-24 overflow-auto rounded bg-white/90 p-2 text-[10px] dark:bg-neutral-900/90">
                      {a1Payload.payloadUtf8}
                    </pre>
                  )}
                  <textarea
                    className="min-h-[80px] w-full rounded-lg border border-neutral-200 p-2 font-mono text-[10px] dark:border-white/10 dark:bg-neutral-900"
                    placeholder="-----BEGIN CERTIFICATE----- ..."
                    value={certPem}
                    onChange={(e) => setCertPem(e.target.value)}
                  />
                  <textarea
                    className="min-h-[56px] w-full rounded-lg border border-neutral-200 p-2 font-mono text-[10px] dark:border-white/10 dark:bg-neutral-900"
                    placeholder="Assinatura (Base64)"
                    value={sigB64}
                    onChange={(e) => setSigB64(e.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={() =>
                      assinarA1.mutate({
                        signatureId: pendingA1.id,
                        body: { certificatePem: certPem, signatureBase64: sigB64 },
                      })
                    }
                    disabled={assinarA1.isPending || !certPem || !sigB64}
                  >
                    Enviar assinatura A1
                  </Button>
                </div>
              )}
              <Button variant="destructive" onClick={() => arquivar.mutate()} disabled={arquivar.isPending}>
                Arquivar
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documentos (Paperless)</CardTitle>
              <CardDescription>SHA-256 registrado na abertura do anexo</CardDescription>
            </CardHeader>
            <ul className="space-y-2 px-6 pb-6 text-sm">
              {data.documents.map((d) => (
                <li key={d.id} className="rounded-lg border border-neutral-100 p-2 dark:border-white/10">
                  <div className="font-medium">{d.title}</div>
                  <div className="break-all text-xs text-neutral-500">SHA-256: {d.sha256}</div>
                </li>
              ))}
              {data.documents.length === 0 && (
                <li className="text-neutral-500">Nenhum anexo ainda.</li>
              )}
            </ul>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prazos</CardTitle>
            </CardHeader>
            <ul className="px-6 pb-6 text-sm">
              {data.deadlines.map((d) => (
                <li key={d.id} className="flex justify-between gap-2 border-b border-neutral-50 py-2 dark:border-white/5">
                  <span>{d.label}</span>
                  <span className="text-xs text-neutral-500">
                    {new Date(d.dueAt).toLocaleDateString('pt-BR')}
                    {d.fulfilledAt ? ' ✓' : ''}
                  </span>
                </li>
              ))}
              {data.deadlines.length === 0 && <li className="text-neutral-500">Sem prazos.</li>}
            </ul>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comentários</CardTitle>
        </CardHeader>
        <ul className="space-y-2 px-6 pb-6 text-sm">
          {data.comments.map((c) => (
            <li key={c.id}>
              <span className="font-medium">{c.user.name}</span>
              <span className="text-xs text-neutral-400"> · {new Date(c.createdAt).toLocaleString('pt-BR')}</span>
              <p className="text-neutral-700 dark:text-neutral-200">{c.body}</p>
            </li>
          ))}
          {data.comments.length === 0 && <li className="text-neutral-500">Sem comentários.</li>}
        </ul>
      </Card>
    </div>
  );
}
