'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card, CardDescription, CardHeader, CardTitle, Button } from '@ged/ui';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

const schema = z.object({
  processTypeId: z.string().min(1),
  subject: z.string().min(3),
  interestedParty: z.string().optional(),
  confidentiality: z.enum(['PUBLICO', 'RESTRITO', 'SIGILOSO']).optional(),
});

type Form = z.infer<typeof schema>;

type ProcessType = { id: string; name: string; code: string };

export default function NovoProcessoPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const { register, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { confidentiality: 'PUBLICO' },
  });

  const { data: types } = useQuery({
    queryKey: ['pae-process-types', accessToken],
    queryFn: () => apiFetch<ProcessType[]>('/pae/process-types', { accessToken }),
    enabled: !!accessToken,
  });

  const mutation = useMutation({
    mutationFn: (body: Form) =>
      apiFetch<{ id: string }>('/pae/processes', {
        method: 'POST',
        accessToken,
        body: JSON.stringify(body),
      }),
    onSuccess: (res) => {
      toast.success('Processo aberto');
      void qc.invalidateQueries({ queryKey: ['pae-processes'] });
      router.push(`/processos/${res.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Abrir processo</h1>
        <p className="text-sm text-neutral-500">Numeração automática (PAE/ano). Unidade padrão: seu setor.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados iniciais</CardTitle>
          <CardDescription>Após criar, anexe documentos (Paperless) e tramite pela timeline.</CardDescription>
        </CardHeader>
        <form className="space-y-4 px-6 pb-6" onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">Tipo</label>
            <select
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-neutral-900"
              {...register('processTypeId')}
            >
              <option value="">Selecione…</option>
              {(types ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
            {formState.errors.processTypeId && (
              <span className="text-xs text-red-500">{formState.errors.processTypeId.message}</span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">Assunto</label>
            <input
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-neutral-900"
              {...register('subject')}
            />
            {formState.errors.subject && (
              <span className="text-xs text-red-500">{formState.errors.subject.message}</span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">Interessado</label>
            <input
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-neutral-900"
              {...register('interestedParty')}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">Sigilo</label>
            <select
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-neutral-900"
              {...register('confidentiality')}
            >
              <option value="PUBLICO">Público</option>
              <option value="RESTRITO">Restrito</option>
              <option value="SIGILOSO">Sigiloso</option>
            </select>
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Abrindo…' : 'Abrir processo'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
