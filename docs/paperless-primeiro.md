# Parte 1 — Subir só o Paperless-ngx

Guia enxuto: **Paperless-ngx** (Postgres + Redis + app), sem API GED nem frontend.

## Opção A — Docker Compose (recomendado)

Usa o stack de [`docker-compose.homologacao.yml`](../docker-compose.homologacao.yml), mas **só** os serviços do Paperless:

```bash
docker compose -f docker-compose.homologacao.yml up -d paperless_postgres paperless_broker paperless
```

Acompanha os logs até o serviço ficar saudável (a primeira vez pode demorar alguns minutos):

```bash
docker compose -f docker-compose.homologacao.yml logs -f paperless
```

**Credenciais iniciais:** em `docker/homolog.env` (ou variáveis no compose) — `PAPERLESS_USERNAME` / `PAPERLESS_PASSWORD` alinhados a `PAPERLESS_ADMIN_USER` / `PAPERLESS_ADMIN_PASSWORD` do contentor (padrão `admin` / `Admin123!`).

**Interface:** [http://localhost:8001](http://localhost:8001)

| Serviço   | Utilizador | Password   |
| --------- | ---------- | ---------- |
| Postgres  | `paperless` | `paperless` (homologação local) |
| Redis     | —          | sem senha no compose de homologação |

Para parar só o stack Paperless:

```bash
docker compose -f docker-compose.homologacao.yml stop paperless paperless_broker paperless_postgres
```

## Opção B — Na Railway

1. Cria **Postgres** e **Redis** no mesmo projeto.  
2. Novo serviço a partir deste repositório.  
3. **Settings** → **Config as code** → **`/docker/paperless/railway.toml`**.  
4. **Variables:** modelo em [`docker/paperless/railway.variables.example`](../docker/paperless/railway.variables.example) — preenche hosts privados (`*.railway.internal`) e passwords.  
5. **Networking** → **Generate domain** para HTTPS público.  
6. **API token (opcional):** na UI Paperless → *Settings* → *Social account* / token de API; podes usar `PAPERLESS_TOKEN` na API GED em vez de user/senha.

**API REST:** `POST /api/token/` com JSON `username` e `password` devolve `token` (header `Authorization: Token …`).

Quando o Paperless estiver estável, na **Parte 2** sobe a API GED com `PAPERLESS_API_URL=https://<teu-dominio>` (URL **raiz** do Paperless, sem `/api`) e `PAPERLESS_USERNAME` / `PAPERLESS_PASSWORD` ou `PAPERLESS_TOKEN`.

## Problemas comuns

- **502 / health:** primeira indexação pode demorar; confere logs do contentor.  
- **OCR em português:** define `PAPERLESS_OCR_LANGUAGE=por` (já no compose de homologação).

Segue [`docs/railway-setup.md`](railway-setup.md) para API + Web na Railway, ou o `docker-compose.homologacao.yml` completo para tudo local.
