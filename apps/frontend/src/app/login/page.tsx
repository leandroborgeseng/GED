'use client';

import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Button, Card, CardDescription, CardHeader, CardTitle } from '@ged/ui';
import { apiFetch } from '@/lib/api';
import type { LoginResponse } from '@ged/types';
import { useAuthStore } from '@/stores/auth-store';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const { register, handleSubmit, formState } = useForm<Form>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (data: Form) =>
      apiFetch<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (res) => {
      setSession({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        user: res.user,
      });
      toast.success('Bem-vindo de volta');
      router.push('/dashboard');
    },
    onError: (e: Error) => toast.error(e.message || 'Falha no login'),
  });

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-neutral-950 via-violet-950/40 to-fuchsia-950/30 px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_40%)]" />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Card className="w-full max-w-md border-white/10 bg-white/10 shadow-2xl backdrop-blur-xl dark:bg-neutral-950/40">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Aurora Docs</CardTitle>
            <CardDescription className="text-neutral-200">
              Gestão eletrônica de documentos — experiência moderna, motor Mayan EDMS.
            </CardDescription>
          </CardHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit((d) => mutation.mutate(d))}
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-200">E-mail</label>
              <input
                className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none ring-violet-400/40 placeholder:text-neutral-400 focus:ring-2"
                placeholder="admin@ged.local"
                autoComplete="email"
                {...register('email')}
              />
              {formState.errors.email && (
                <span className="text-xs text-red-300">{formState.errors.email.message}</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-neutral-200">Senha</label>
              <input
                type="password"
                className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none ring-violet-400/40 placeholder:text-neutral-400 focus:ring-2"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password')}
              />
              {formState.errors.password && (
                <span className="text-xs text-red-300">{formState.errors.password.message}</span>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-neutral-300">
            Demo: admin@ged.local / Admin123! (após seed)
          </p>
        </Card>
      </motion.div>
    </div>
  );
}
