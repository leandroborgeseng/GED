# Deploy na Railway (API + Web + Mayan)

O Railway **não cria automaticamente** vários serviços só por ligares o GitHub ao repositório. Cada serviço é um deploy à parte; o que este repositório oferece são **ficheiros `railway.toml` por componente** e este guia para configurares o painel em poucos passos.

## O que existe no repo

| Ficheiro | Serviço | Dockerfile |
|----------|---------|------------|
| [`apps/backend/railway.toml`](../apps/backend/railway.toml) | API Nest (GED) | `apps/backend/Dockerfile` |
| [`apps/frontend/railway.toml`](../apps/frontend/railway.toml) | Interface Next.js | `apps/frontend/Dockerfile` |
| [`docker/mayan/railway.toml`](../docker/mayan/railway.toml) | Mayan EDMS | `docker/mayan/Dockerfile` |
| [`railway.toml`](../railway.toml) (raiz) | Mesmo que a API (compatibilidade se não definires outro path) | `apps/backend/Dockerfile` |

Em **cada** serviço na Railway: **Settings** → **Build** → **Config as code** → caminho absoluto do ficheiro (ex.: `/apps/frontend/railway.toml`).

## Limitação importante (Mayan)

O Mayan **oficial** precisa de **PostgreSQL + Redis + RabbitMQ** além do contentor da app. Na Railway isso significa **mais do que um único serviço “Mayan”** na prática (plugins ou serviços extra na mesma rede privada). Para homologação simples, o [`docker-compose.homologacao.yml`](../docker-compose.homologacao.yml) no teu computador já sobe tudo de uma vez.

Na Railway, opções realistas:

1. **Só API + Web + Postgres (GED)** — Mayan opcional: `MAYAN_*` vazios na API até teres stack Mayan estável.  
2. **Template gerado no painel** — com o projeto já montado: **Project** → **⋯** → **Generate template** — partilhas o link e quem clica recebe os mesmos serviços pré-configurados.  
3. **Mayan noutro host** — URL na API com `MAYAN_API_URL`.

## Passo a passo mínimo (API + Web + Postgres)

1. **New project** → GitHub → repo GED.  
2. **Add** → **Database** → **PostgreSQL** (nome ex.: `Postgres`).  
3. **Serviço API**  
   - Duplica o serviço default ou cria novo a partir do repo.  
   - **Config file:** `/apps/backend/railway.toml` (ou deixa a raiz se usares só [`railway.toml`](../railway.toml)).  
   - **Root directory:** vazio.  
   - **Variables:** `DATABASE_URL=${{ Postgres.DATABASE_URL }}`, `JWT_SECRET`, `CORS_ORIGIN` (URL do frontend), `MAYAN_*` se aplicável.  
   - **Generate domain** → ex.: `https://ged-api…up.railway.app`.  
4. **Serviço Web** (novo serviço, mesmo repo)  
   - **Config file:** `/apps/frontend/railway.toml`.  
   - **Root directory:** vazio.  
   - **Variables / build args:** `NEXT_PUBLIC_API_URL=https://<domínio-da-api>/api`.  
   - **Generate domain** → abre este URL no browser (interface).  
5. Volta à **API** e define `CORS_ORIGIN=https://<domínio-do-frontend>.up.railway.app`.  
6. **Redeploy** do frontend se mudares `NEXT_PUBLIC_API_URL`.

## Serviço Mayan (avançado)

1. Cria Postgres + Redis + RabbitMQ (ou equivalentes) com **Private Networking** e hostnames estáveis.  
2. Novo serviço a partir do repo → **Config file:** `/docker/mayan/railway.toml`.  
3. Preenche as variáveis de ambiente no mesmo formato que em [`docker-compose.homologacao.yml`](../docker-compose.homologacao.yml) (serviço `mayan` e dependências).  
4. Na **API**, `MAYAN_API_URL=https://<domínio-privado-ou-público-do-mayan>/api/v4` e credenciais.

## Variáveis de referência

- API: [`railway.env.example`](../railway.env.example)  
- Mayan (notas): [`docker/mayan/railway.env.example`](../docker/mayan/railway.env.example)
