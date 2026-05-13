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

## Publicar no Railway (GitHub → deploy)

1. **Suba o código no GitHub** (branch `main`):

   ```bash
   git add -A && git commit -m "sua mensagem" && git push origin main
   ```

2. No [Railway](https://railway.app): **New Project** → **Deploy from GitHub** → selecione o repositório **GED**.

3. **PostgreSQL**: adicione o plugin **Database** → **PostgreSQL**. Copie a variável `DATABASE_URL` (ou use a referência de serviço que o Railway oferece).

4. **Serviço API (Nest)**  
   - Fonte: mesmo repo. **Root directory**: deixe em branco (raiz).  
   - **Dockerfile**: `apps/backend/Dockerfile` (o `railway.toml` na raiz já aponta para ele).  
   - Variáveis de ambiente: `DATABASE_URL`, `JWT_SECRET` (obrigatório em produção), `CORS_ORIGIN` (URL pública do frontend, ex. `https://seu-frontend.up.railway.app`), e `MAYAN_*` quando o Mayan estiver disponível.  
   - Gere um domínio público para a API e anote a URL base (ex. `https://ged-api-production.up.railway.app`).

5. **Serviço Web (Next)** — **novo serviço** no mesmo projeto, mesmo repositório:  
   - **Dockerfile**: `apps/frontend/Dockerfile`.  
   - **Build argument / variável** (importante no build): `NEXT_PUBLIC_API_URL=https://<URL-da-sua-API>/api` (use a URL real do passo 4). Sem isso, o browser chama a API errada.  
   - Defina também `NEXT_PUBLIC_API_URL` como variável de ambiente em runtime se o Railway propagar para o container do Next standalone.

6. Faça **Redeploy** do frontend após mudar a URL da API, para recompilar com o `NEXT_PUBLIC_*` correto.

## Documentação adicional

- Planejamento futuro (editor rich / PDF): [`docs/planejamento-editor-rico-despacho-pdf.md`](docs/planejamento-editor-rico-despacho-pdf.md)
