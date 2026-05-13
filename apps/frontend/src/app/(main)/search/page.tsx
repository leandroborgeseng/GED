'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription } from '@ged/ui';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

export default function SearchPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data } = useQuery({
    queryKey: ['search', accessToken],
    queryFn: () => apiFetch<{ engine: string; hits: unknown[] }>('/search?q=', { accessToken }),
    enabled: !!accessToken,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Busca global</h1>
      <Card>
        <CardHeader>
          <CardTitle>Motor</CardTitle>
          <CardDescription>
            {data?.engine === 'stub'
              ? 'OpenSearch/Elasticsearch preparado — hits mock até configurar OPENSEARCH_URL.'
              : 'OpenSearch'}
          </CardDescription>
        </CardHeader>
        <p className="px-6 pb-6 text-sm text-neutral-500">Integração avançada com Mayan + índice externo em roadmap.</p>
      </Card>
    </div>
  );
}
