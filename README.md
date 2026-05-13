# GED

Plataforma GED/PAE (monorepo): **NestJS** (`apps/backend`), **Next.js 15** (`apps/frontend`), pacotes compartilhados (`packages/*`), integração com **Mayan EDMS** e **PostgreSQL**.

## Pré-requisitos

- Node.js 20+ (recomendado)
- Docker (para Postgres local) **ou** instância PostgreSQL acessível
- Opcional: Mayan em execução (uploads e OCR); sem Mayan a API sobe, mas endpoints que chamam o Mayan podem falhar até configurar `MAYAN_*`

## Rodar em desenvolvimento

1. **Banco de dados** (Postgres na porta 5432, usuário/senha/db `ged`):

   ```bash
   docker compose up -d postgres
   ```

2. **Variáveis de ambiente** do backend:

   ```bash
   cp apps/backend/.env.example apps/backend/.env
   ```

   Ajuste `DATABASE_URL`, `JWT_SECRET`, `MAYAN_*` conforme seu ambiente.

3. **Dependências e Prisma** (na raiz do repositório):

   ```bash
   npm install
   cd apps/backend && npx prisma migrate deploy && npx prisma db seed && cd ../..
   ```

4. **API + frontend** (dois processos):

   ```bash
   npm run dev
   ```

   - API: [http://localhost:4000/api](http://localhost:4000/api) — Swagger: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
   - Web: [http://localhost:3000](http://localhost:3000)

5. **Login de demonstração** (após o seed):

   - E-mail: `admin@ged.local`
   - Senha: `Admin123!`

## Build de produção

```bash
npm run build
```

## Docker (API + web + Postgres)

```bash
docker compose up --build
```

Defina `JWT_SECRET` e, se usar Mayan, `MAYAN_API_URL`, `MAYAN_USERNAME`, `MAYAN_PASSWORD`, `MAYAN_DOCUMENT_TYPE_ID`.

## Documentação adicional

- Planejamento futuro (editor rich / PDF): [`docs/planejamento-editor-rico-despacho-pdf.md`](docs/planejamento-editor-rico-despacho-pdf.md)
