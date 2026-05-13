import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  /** Monorepo: raiz do repo (packages/, apps/) para tracing e aviso de múltiplos lockfiles. */
  outputFileTracingRoot: path.join(__dirname, '../..'),
  transpilePackages: ['@ged/ui', '@ged/types'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
  },
};

export default nextConfig;
