# Deploy na Railway (API + Web + Paperless-ngx)

Este repositório inclui ficheiros **Config as code** por serviço (cada app na Railway aponta para um `railway.toml` dentro do repo).

| Ficheiro | Serviço | Dockerfile / build |
| -------- | ------- | ------------------- |
| [`railway.toml`](railway.toml) | **GED-API** (NestJS) | `apps/backend/Dockerfile` |
| [`apps/frontend/railway.toml`](apps/frontend/railway.toml) | **GED-Web** (Next.js) | `apps/frontend/Dockerfile` |
| [`docker/paperless/railway.toml`](docker/paperless/railway.toml) | **Paperless-ngx** | `docker/paperless/Dockerfile` |

## Quando já tens Postgres e Redis (Paperless) na Railway

Objetivo: **três serviços a partir do mesmo repo** — `Paperless`, `GED-API`, `GED-Web` — mais a infraestrutura que criares.

### 1) Serviço **Paperless-ngx**

1. **Config file:** `/docker/paperless/railway.toml`  
2. **Variables:** copia o modelo em [`docker/paperless/railway.variables.example`](docker/paperless/railway.variables.example) e substitui `<PG_HOST>`, `<REDIS_HOST>`, passwords e URLs. O Paperless usa variáveis `PAPERLESS_DB*` e `PAPERLESS_REDIS` (não reutiliza automaticamente `DATABASE_URL` do plugin Postgres — extrai host, user, password e monta as variáveis conforme o exemplo).  
3. **Networking** → **Generate domain** (HTTPS) para a UI e para a API consumir documentos.  
4. Cria utilizador admin (ou confirma que `PAPERLESS_ADMIN_*` aplicou na primeira subida).

### 2) Serviço **GED-API**

1. **Config file:** `/railway.toml`  
2. **Variables:**  
   - `DATABASE_URL` → referência ao **Postgres do GED** (separado do Postgres do Paperless).  
   - `JWT_SECRET`, `PORT` (se necessário).  
   - `CORS_ORIGIN` → URL pública do frontend.  
   - **Paperless:** `PAPERLESS_API_URL=https://<domínio-público-paperless>` (raiz do site, **sem** sufixo `/api`), mais uma de:  
     - `PAPERLESS_TOKEN` (token de API gerado na UI Paperless), **ou**  
     - `PAPERLESS_USERNAME` e `PAPERLESS_PASSWORD`.  

### 3) Serviço **GED-Web**

1. **Config file:** `/apps/frontend/railway.toml`  
2. **Build args / env:** `NEXT_PUBLIC_API_URL=https://<domínio-da-api>/api` (URL pública da API GED).

### Ordem sugerida de deploy

1. Postgres + Redis para o Paperless **healthy**  
2. Serviço **Paperless** até responder na UI  
3. Postgres do GED + **GED-API** (com `prisma migrate deploy` no build, se o teu Dockerfile já o fizer)  
4. **GED-Web** com `NEXT_PUBLIC_API_URL` correto  
5. `CORS_ORIGIN` na API alinhado ao domínio do Web  

## Passo a passo mínimo (só API + Web + Postgres GED, sem Paperless)

Podes ignorar o Paperless em desenvolvimento: deixa `PAPERLESS_USERNAME` / `PAPERLESS_PASSWORD` e `PAPERLESS_TOKEN` vazios — login e PAE funcionam; endpoints que falam com o Paperless podem responder 503 ou lista vazia até configurares o motor documental.

## Referências

- Paperless só: [`docs/paperless-primeiro.md`](paperless-primeiro.md)  
- Variáveis Paperless (Railway): [`docker/paperless/railway.variables.example`](docker/paperless/railway.variables.example)
