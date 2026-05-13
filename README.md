# GED

Plataforma GED/PAE (monorepo): **NestJS** (`apps/backend`), **Next.js 15** (`apps/frontend`), pacotes compartilhados (`packages/*`), integração com **Paperless-ngx** e **PostgreSQL**.

## Pré-requisitos

- Node.js 20+ (recomendado)
- Docker (para Postgres local) **ou** instância PostgreSQL acessível
- Opcional: **Paperless-ngx** em execução (uploads e OCR); sem Paperless a API sobe, mas endpoints que chamam o motor documental podem falhar até configurares `PAPERLESS_*` ou `PAPERLESS_TOKEN`.

**Forma mais simples para desenvolver e testar o GED:** só precisas de **PostgreSQL**. **Redis** não é usado pela API Nest em si — entra no stack do **Paperless** (broker/cache). Sem Paperless, deixa `PAPERLESS_USERNAME` / `PAPERLESS_PASSWORD` e `PAPERLESS_TOKEN` vazios no `.env`; login, processos e resto do PAE funcionam, e rotas que falam com o Paperless podem responder vazio ou 503 até configurares o motor documental.

## Rodar em desenvolvimento

1. **Banco de dados** (Postgres na porta 5432, usuário/senha/db `ged`):

   ```bash
   docker compose up -d postgres
   ```

2. **Variáveis de ambiente** do backend:

   ```bash
   cp apps/backend/.env.example apps/backend/.env
   ```

   Ajuste `DATABASE_URL`, `JWT_SECRET`, `PAPERLESS_*` conforme seu ambiente.

3. **Dependências e Prisma** (na raiz do repositório):

   ```bash
   npm install
   cd apps/backend && npx prisma migrate deploy && npx prisma db seed && cd ../..
   ```

   Se aparecer **P1012 / Environment variable not found: DATABASE_URL**, crie `apps/backend/.env` a partir de `.env.example` (`cp apps/backend/.env.example apps/backend/.env`) ou exporte `DATABASE_URL` antes dos comandos Prisma. O **Dockerfile da API** já define uma URL fictícia só na etapa de build para o `prisma generate` no Railway.

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

Defina `JWT_SECRET` e, se usar Paperless, `PAPERLESS_API_URL` e (`PAPERLESS_TOKEN` **ou** `PAPERLESS_USERNAME` + `PAPERLESS_PASSWORD`).

## Docker homologação (GED + Paperless-ngx, um comando)

Sobe **Postgres do GED**, **API**, **Web**, **Paperless-ngx** (Postgres + Redis + app) na mesma rede. A API usa `PAPERLESS_API_URL=http://paperless:8000` dentro do Docker.

**Requisitos:** Docker com ~2 GB de RAM livre (primeira subida do Paperless pode levar alguns minutos).

```bash
docker compose -f docker-compose.homologacao.yml --env-file docker/homolog.env up -d --build
```

**Portas:** web `http://localhost:3000`, API `http://localhost:4000/api`, Paperless `http://localhost:8001`, Postgres do GED `localhost:5432`.

**Primeira execução:**

1. Acompanhe os logs do Paperless até o healthcheck passar: `docker compose -f docker-compose.homologacao.yml logs -f paperless`
2. Abra **http://localhost:8001** e confirme o login com `PAPERLESS_USERNAME` / `PAPERLESS_PASSWORD` de `docker/homolog.env` (padrão `admin` / `Admin123!`), criados via `PAPERLESS_ADMIN_*` no contentor.
3. Popule o GED (usuário demo da API):

   ```bash
   docker compose -f docker-compose.homologacao.yml exec api npx prisma db seed
   ```

4. Acesse **http://localhost:3000** e faça login com `admin@ged.local` / `Admin123!` (após o seed).

Credenciais e segredos em `docker/homolog.env` são **só para homologação**; não use em produção.

## Publicar no Railway (GitHub → deploy)

Guia detalhado (vários serviços, `railway.toml` por app): **[`docs/railway-setup.md`](docs/railway-setup.md)**.

1. **Suba o código no GitHub** (branch `main`):

   ```bash
   git add -A && git commit -m "sua mensagem" && git push origin main
   ```

2. No [Railway](https://railway.app): **New Project** → **Deploy from GitHub** → selecione o repositório **GED**.

3. **PostgreSQL**: adicione o plugin **Database** → **PostgreSQL** (deixe o serviço com um nome fácil de referenciar, ex. `Postgres`).

4. **Serviço API (Nest)** — **obrigatório ligar o banco**  
   - Fonte: mesmo repo. **Root directory**: deixe em branco (raiz).  
   - **Dockerfile**: `apps/backend/Dockerfile` (o `railway.toml` na raiz já aponta para ele).  
   - **Variables (crítico):** no serviço da API, crie **`DATABASE_URL`** com **Reference Variable** apontando para o Postgres do projeto, por exemplo `${{ Postgres.DATABASE_URL }}` (troque `Postgres` pelo **nome exato** do serviço de banco no painel). Sem isso o container falha com **P1012** ao rodar `prisma migrate deploy`.  
   - Crie também **`JWT_SECRET`** (string longa e aleatória; sem ela a API cai com *Configuration key JWT_SECRET does not exist*).  
   - Veja também o ficheiro [`railway.env.example`](railway.env.example) para colar no RAW Editor (ajustando o nome do serviço Postgres).  
   - Outras variáveis: `CORS_ORIGIN` (URL pública do frontend), e `PAPERLESS_*` / `PAPERLESS_TOKEN` quando o Paperless estiver disponível.  
   - Gere um domínio público para a API e anote a URL base (ex. `https://ged-api-production.up.railway.app`).

5. **Serviço Web (Next)** — **novo serviço** no mesmo projeto, mesmo repositório:  
   - **Dockerfile**: `apps/frontend/Dockerfile`.  
   - **Build argument / variável** (importante no build): `NEXT_PUBLIC_API_URL=https://<URL-da-sua-API>/api` (use a URL real do passo 4). Sem isso, o browser chama a API errada.  
   - Defina também `NEXT_PUBLIC_API_URL` como variável de ambiente em runtime se o Railway propagar para o container do Next standalone.

6. Faça **Redeploy** do frontend após mudar a URL da API, para recompilar com o `NEXT_PUBLIC_*` correto.

### 502 ou “porta 3000” na Railway

- **Não coloques `:3000` nem `:4000` no URL público** (`https://….up.railway.app`). O acesso é sempre por **HTTPS na porta 443**; o Railway encaminha para a porta interna que define em `PORT` (nos logs da API costuma aparecer como `8080` dentro do contentor). `https://teu-dominio.up.railway.app:3000` **não** aponta para a app e costuma resultar em **502** ou falha de ligação.
- A API Nest passa a escutar em **`0.0.0.0`** (e `HOST` opcional); sem isto, alguns ambientes só aceitam ligações em `127.0.0.1` e o proxy da Railway devolve **502** em `GET /`.
- O serviço cujo deploy mostra **Nest** (rotas `/api/...`) é só a **API**. A **interface (Next.js)** é outro serviço, com outro domínio gerado na Railway — abre esse URL **sem** sufixo de porta.
- Para testar a API: `https://<domínio-da-api>/` (JSON de ajuda) ou `https://<domínio-da-api>/api/health`.

**Railway e stack com Paperless:** o Railway não aplica um `docker-compose` inteiro como um único deploy. Replique **serviços separados** (Postgres GED, Postgres + Redis + Paperless, API GED, Web GED) e as variáveis de [`railway.env.example`](railway.env.example) / [`docker/paperless/railway.variables.example`](docker/paperless/railway.variables.example), com `PAPERLESS_API_URL` apontando para a URL **raiz** (sem `/api`) do serviço Paperless.

## Documentação adicional

- **Só Paperless primeiro (local ou Railway):** [`docs/paperless-primeiro.md`](docs/paperless-primeiro.md)
- Railway (API + Web + Paperless): [`docs/railway-setup.md`](docs/railway-setup.md)
- Planejamento futuro (editor rich / PDF): [`docs/planejamento-editor-rico-despacho-pdf.md`](docs/planejamento-editor-rico-despacho-pdf.md)
