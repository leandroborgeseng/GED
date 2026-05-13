'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardHeader, CardTitle, CardDescription } from '@ged/ui';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';

export default function DocumentViewerPage() {
  const params = useParams();
  const id = Number(params.id);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mime, setMime] = useState<string | null>(null);

  const { data: meta } = useQuery({
    queryKey: ['document', id, accessToken],
    queryFn: () => apiFetch<Record<string, unknown>>(`/documents/${id}`, { accessToken }),
    enabled: !!accessToken && Number.isFinite(id),
  });

  useEffect(() => {
    if (!accessToken || !Number.isFinite(id)) return;
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
    let revoked = false;
    (async () => {
      const res = await fetch(`${base}/documents/${id}/download`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      if (revoked) return;
      setMime(blob.type);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    })();
    return () => {
      revoked = true;
      setPreviewUrl((u) => {
        if (u) URL.revokeObjectURL(u);
        return null;
      });
    };
  }, [accessToken, id]);

  const fileLatest = meta?.file_latest as { filename?: string; mimetype?: string } | undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/documents">
          <Button variant="secondary" size="icon" type="button">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">{String(meta?.label ?? fileLatest?.filename ?? `Documento ${id}`)}</h1>
          <p className="text-sm text-neutral-500">Preview seguro via gateway (token).</p>
        </div>
        <a
          className="ml-auto"
          href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'}/documents/${id}/download`}
          onClick={(e) => {
            e.preventDefault();
            if (!accessToken) return;
            const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
            void fetch(`${base}/documents/${id}/download`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            })
              .then((r) => r.blob())
              .then((b) => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(b);
                a.download = fileLatest?.filename ?? 'documento';
                a.click();
              });
          }}
        >
          <Button type="button" variant="secondary">
            <Download className="mr-2 h-4 w-4" />
            Baixar
          </Button>
        </a>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Visualização</CardTitle>
            <CardDescription>PDF e imagens no navegador; Office via download.</CardDescription>
          </CardHeader>
          <div className="min-h-[480px] overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50 dark:border-white/10 dark:bg-black/40">
            {previewUrl && (mime?.includes('pdf') || fileLatest?.mimetype?.includes('pdf')) ? (
              <iframe title="preview" src={previewUrl} className="h-[70vh] w-full" />
            ) : previewUrl && mime?.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="preview" src={previewUrl} className="mx-auto max-h-[70vh] object-contain" />
            ) : (
              <div className="flex h-[400px] items-center justify-center text-sm text-neutral-500">
                Preview indisponível para este tipo. Use Baixar.
              </div>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Metadados</CardTitle>
            <CardDescription>OCR / índice no Paperless-ngx</CardDescription>
          </CardHeader>
          <pre className="max-h-[420px] overflow-auto rounded-lg bg-neutral-900/90 p-3 text-xs text-neutral-100">
            {JSON.stringify(meta, null, 2)}
          </pre>
        </Card>
      </div>
    </div>
  );
}
