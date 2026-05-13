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

Defina `JWT_SECRET` e, se usar Mayan, `MAYAN_API_URL`, `MAYAN_USERNAME`, `MAYAN_PASSWORD`, `MAYAN_DOCUMENT_TYPE_ID`.

## Docker homologação (GED + Mayan, um comando)

Sobe **Postgres do GED**, **API**, **Web**, **Mayan EDMS** (Postgres + Redis + RabbitMQ + app) na mesma rede. A API usa `MAYAN_API_URL=http://mayan:8000/api/v4` dentro do Docker.

**Requisitos:** Docker com ~4 GB de RAM livre (primeira subida do Mayan pode levar vários minutos).

```bash
docker compose -f docker-compose.homologacao.yml --env-file docker/homolog.env up -d --build
```

**Portas:** web `http://localhost:3000`, API `http://localhost:4000/api`, Mayan `http://localhost:8001`, Postgres do GED `localhost:5432`.

**Primeira execução:**

1. Acompanhe os logs do Mayan até o healthcheck passar: `docker compose -f docker-compose.homologacao.yml logs -f mayan`
2. Abra **http://localhost:8001** e conclua o assistente de instalação. Crie o superusuário de forma que **usuário e senha** coincidam com `MAYAN_USERNAME` e `MAYAN_PASSWORD` em `docker/homolog.env` (padrão `admin` / `Admin123!`).
3. Em tipos de documento, confira o **ID** do tipo padrão; se não for `1`, ajuste `MAYAN_DOCUMENT_TYPE_ID` em `docker/homolog.env` (ou copie o arquivo para `docker/homolog.local.env`, altere e use `--env-file docker/homolog.local.env`).
4. Popule o GED (usuário demo da API):

   ```bash
   docker compose -f docker-compose.homologacao.yml exec api npx prisma db seed
   ```

5. Acesse **http://localhost:3000** e faça login com `admin@ged.local` / `Admin123!` (após o seed).

Credenciais e segredos em `docker/homolog.env` são **só para homologação**; não use em produção.

## Publicar no Railway (GitHub → deploy)

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
   - Outras variáveis: `JWT_SECRET` (obrigatório em produção), `CORS_ORIGIN` (URL pública do frontend), e `MAYAN_*` quando o Mayan estiver disponível.  
   - Gere um domínio público para a API e anote a URL base (ex. `https://ged-api-production.up.railway.app`).

5. **Serviço Web (Next)** — **novo serviço** no mesmo projeto, mesmo repositório:  
   - **Dockerfile**: `apps/frontend/Dockerfile`.  
   - **Build argument / variável** (importante no build): `NEXT_PUBLIC_API_URL=https://<URL-da-sua-API>/api` (use a URL real do passo 4). Sem isso, o browser chama a API errada.  
   - Defina também `NEXT_PUBLIC_API_URL` como variável de ambiente em runtime se o Railway propagar para o container do Next standalone.

6. Faça **Redeploy** do frontend após mudar a URL da API, para recompilar com o `NEXT_PUBLIC_*` correto.

**Railway e stack com Mayan:** o Railway não aplica um `docker-compose` inteiro como um único deploy com vários serviços. Para **um ambiente já igual ao compose** (GED + Mayan), o caminho mais simples é uma **VM ou host com Docker** rodando o comando da secção **Docker homologação (GED + Mayan, um comando)** acima. Na Railway, replique **serviços separados** (Postgres GED, Postgres/Redis/Rabbit/Mayan, API GED, Web GED) e as mesmas variáveis de `docker/homolog.env`, com `MAYAN_API_URL` apontando para a URL **interna ou pública** do serviço Mayan.

## Documentação adicional

- Planejamento futuro (editor rich / PDF): [`docs/planejamento-editor-rico-despacho-pdf.md`](docs/planejamento-editor-rico-despacho-pdf.md)
