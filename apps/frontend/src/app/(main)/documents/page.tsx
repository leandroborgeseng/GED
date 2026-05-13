'use client';

import { useCallback, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardDescription, Button } from '@ged/ui';
import { apiFetch } from '@/lib/api';
import type { PaperlessDocumentListItem } from '@ged/types';
import { useAuthStore } from '@/stores/auth-store';
import Link from 'next/link';
import { Grid, List, Upload } from 'lucide-react';

type ListResponse = { count: number; results: PaperlessDocumentListItem[] };

export default function DocumentsPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['documents', accessToken],
    queryFn: () => apiFetch<ListResponse>('/documents?page=1&pageSize=50', { accessToken }),
    enabled: !!accessToken,
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
      const res = await fetch(`${base}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast.success('Upload enviado ao Paperless-ngx via gateway');
      void qc.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      Array.from(files).forEach((f) => upload.mutate(f));
    },
    [upload],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      className="space-y-6"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
          <p className="text-sm text-neutral-500">Explorer estilo drive — arraste arquivos para enviar.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant={view === 'grid' ? 'default' : 'secondary'} size="icon" onClick={() => setView('grid')}>
            <Grid className="h-4 w-4" />
          </Button>
          <Button type="button" variant={view === 'list' ? 'default' : 'secondary'} size="icon" onClick={() => setView('list')}>
            <List className="h-4 w-4" />
          </Button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Biblioteca</CardTitle>
          <CardDescription>{isLoading ? 'Carregando…' : `${data?.count ?? 0} itens`}</CardDescription>
        </CardHeader>
        <div
          className={
            view === 'grid'
              ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'flex flex-col gap-2'
          }
        >
          {(data?.results ?? []).map((doc) => (
            <Link
              key={doc.id}
              href={`/documents/${doc.id}`}
              className={
                view === 'grid'
                  ? 'rounded-2xl border border-neutral-100 bg-neutral-50/80 p-4 transition hover:border-violet-300 hover:shadow-md dark:border-white/10 dark:bg-white/5'
                  : 'flex items-center justify-between rounded-xl border border-neutral-100 px-4 py-3 dark:border-white/10'
              }
            >
              <div>
                <div className="font-medium">{doc.label ?? doc.file_latest?.filename ?? `Documento ${doc.id}`}</div>
                <div className="text-xs text-neutral-500">{doc.document_type?.label}</div>
              </div>
              <div className="text-xs text-neutral-400">{doc.datetime_created?.slice(0, 10)}</div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
