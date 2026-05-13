# Deploy na Railway (API + Web + Mayan)

O Railway **não cria automaticamente** vários serviços só por ligares o GitHub ao repositório. Cada serviço é um deploy à parte; o que este repositório oferece são **ficheiros `railway.toml` por componente** e este guia.

## O que existe no repo

| Ficheiro | Serviço | Dockerfile |
|----------|---------|------------|
| [`apps/backend/railway.toml`](../apps/backend/railway.toml) | API Nest (GED) | `apps/backend/Dockerfile` |
| [`apps/frontend/railway.toml`](../apps/frontend/railway.toml) | Interface Next.js | `apps/frontend/Dockerfile` |
| [`docker/mayan/railway.toml`](../docker/mayan/railway.toml) | Mayan EDMS | `docker/mayan/Dockerfile` |
| [`railway.toml`](../railway.toml) (raiz) | Igual à API (se não definires outro path no serviço) | `apps/backend/Dockerfile` |

Em **cada** serviço: **Settings** → **Build** → **Config as code** → caminho absoluto (ex.: `/apps/frontend/railway.toml`). **Root directory:** vazio (raiz do monorepo).

---

## Quando já tens Postgres, Redis e RabbitMQ (Mayan) na Railway

Objetivo: **três serviços a partir do mesmo repo** — `Mayan`, `GED-API`, `GED-Web` — mais os dados/infra que já criaste.

### 1) Serviço **Mayan** (novo serviço → GitHub → mesmo repo GED)

1. **Config file:** `/docker/mayan/railway.toml`  
2. **Variables:** copia o modelo em [`docker/mayan/railway.variables.example`](../docker/mayan/railway.variables.example) e substitui:
   - **`<PG_HOST>`** — hostname **privado** do Postgres do Mayan (painel desse Postgres → *Connect* / rede interna; costuma ser algo como `xxx.railway.internal`).  
   - **`<REDIS_HOST>`** e **`<RABBIT_HOST>`** — idem para Redis e RabbitMQ.  
   - Ajusta **passwords** se não usares os mesmos do [`docker-compose.homologacao.yml`](../docker-compose.homologacao.yml) (`mayandbpass`, `mayanredispassword`, `mayanrabbitpass`).  
3. **Networking** → **Generate domain** (público) para abrires o Mayan no browser (primeira vez: assistente + superuser).  
4. A primeira subida pode levar **vários minutos** (migrações Django).

### 2) Serviço **GED-API** (backend)

1. **Config file:** `/apps/backend/railway.toml`  
2. **Postgres do GED** (separado do Mayan): `DATABASE_URL=${{ NomeDoPostgresGED.DATABASE_URL }}`  
3. `JWT_SECRET`, `CORS_ORIGIN` = URL pública do **frontend** (passo 3).  
4. **Mayan para a API GED:** depois do Mayan ter domínio:
   - `MAYAN_API_URL=https://<domínio-público-mayan>/api/v4`  
   - `MAYAN_USERNAME`, `MAYAN_PASSWORD`, `MAYAN_DOCUMENT_TYPE_ID` (após criares user/tipo no Mayan).  
5. **Generate domain** da API.

### 3) Serviço **GED-Web** (frontend)

1. **Config file:** `/apps/frontend/railway.toml`  
2. `NEXT_PUBLIC_API_URL=https://<domínio-público-da-API>/api`  
3. **Generate domain** do frontend → é este URL que abres para a **interface**.  
4. **Redeploy** do frontend se mudares a URL da API (valor vai “cozinhado” no build).

### 4) Ajuste final

- Na **API**, atualiza `CORS_ORIGIN` com o URL exato do **GED-Web**.  
- Se a API chamasse o Mayan só pela rede interna, podes usar o hostname privado do Mayan em `MAYAN_API_URL` — desde que o contentor da API resolva esse DNS (mesmo projeto Railway).

---

## Ordem sugerida de primeira subida

1. Infra Mayan (Postgres Mayan + Redis + Rabbit) **healthy**  
2. Serviço **Mayan** até responder em `/`  
3. Postgres **GED** + serviço **GED-API** (+ `prisma migrate` no arranque)  
4. **GED-Web** com `NEXT_PUBLIC_API_URL` apontando para a API  
5. `CORS_ORIGIN` na API + credenciais `MAYAN_*`

---

## Passo a passo mínimo (só API + Web + Postgres GED, sem Mayan)

1. **New project** → GitHub → repo GED.  
2. **Add** → **Database** → **PostgreSQL** (nome ex.: `Postgres`).  
3. **Serviço API** — **Config file:** `/apps/backend/railway.toml`, `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`.  
4. **Serviço Web** — **Config file:** `/apps/frontend/railway.toml`, `NEXT_PUBLIC_API_URL=https://<api>/api`.  
5. `CORS_ORIGIN` na API com o URL do frontend.

---

## Template “um clique” para a equipa

Com o projeto já montado na Railway: **Project** → **⋯** → **Generate template** — partilhas o link e quem clica recebe os mesmos serviços (com variáveis a preencher).

---

## Variáveis de referência

- API (GED): [`railway.env.example`](../railway.env.example)  
- Mayan (Railway): [`docker/mayan/railway.variables.example`](../docker/mayan/railway.variables.example)
