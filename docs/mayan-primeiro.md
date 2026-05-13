# Parte 1 — Subir só o Mayan

Guia enxuto: primeiro o **Mayan EDMS** (Postgres + Redis + RabbitMQ + app), sem API GED nem frontend.

---

## Opção A — No teu computador (Docker, recomendado para testar)

Usa o mesmo stack de [`docker-compose.homologacao.yml`](../docker-compose.homologacao.yml), mas **só** os serviços do Mayan (não sobe Postgres do GED, API nem Web).

Na **raiz do repositório**:

```bash
docker compose -f docker-compose.homologacao.yml up -d mayan_postgres mayan_rabbitmq mayan_redis mayan
```

Acompanha os logs até o Mayan ficar saudável (a primeira vez pode demorar vários minutos):

```bash
docker compose -f docker-compose.homologacao.yml logs -f mayan
```

Abre no browser: **http://localhost:8001**

**Primeira execução:** conclui o assistente de instalação do Mayan e cria o superutilizador (anota login e senha — vais precisar na API GED depois com `MAYAN_USERNAME` / `MAYAN_PASSWORD`).

**Credenciais por defeito** (igual ao compose; podes mudar antes do primeiro `up` editando o YAML):

| Componente | Utilizador | Palavra-passe |
|------------|------------|----------------|
| Postgres (Mayan) | `mayan` | `mayandbpass` |
| Redis | — | `mayanredispassword` |
| RabbitMQ | `mayan` | `mayanrabbitpass` (vhost `mayan`) |

Para parar só o stack Mayan:

```bash
docker compose -f docker-compose.homologacao.yml stop mayan mayan_postgres mayan_rabbitmq mayan_redis
```

---

## Opção B — Na Railway (só serviço Mayan + infra que já criaste)

1. No projeto, confirma que tens **Postgres** (base para o Mayan), **Redis** e **RabbitMQ** no mesmo projeto (rede privada entre serviços).  
2. **New service** → liga o repositório **GED**.  
3. **Settings** → **Build** → **Config as code** → ficheiro **`/docker/mayan/railway.toml`**.  
4. **Root directory:** vazio (raiz do repo).  
5. **Variables** (serviço Mayan): copia o modelo em [`docker/mayan/railway.variables.example`](../docker/mayan/railway.variables.example) e substitui **`<PG_HOST>`**, **`<REDIS_HOST>`** e **`<RABBIT_HOST>`** pelos **hostnames privados** que o painel de cada serviço indica (muitas vezes algo como `*.railway.internal`). Mantém passwords alinhadas ao que definiste nesses serviços.  
6. **Networking** → **Generate domain** para teres HTTPS público ao Mayan.  
7. Abre esse URL, completa o assistente e cria o superutilizador.

Quando o Mayan estiver estável, na **Parte 2** podes subir a API GED com `MAYAN_API_URL=https://<este-dominio>/api/v4` e as credenciais que criaste.

---

## Verificar se está OK

- **Local:** `curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/` → esperado `200` ou `302` após o arranque.  
- **API REST (token):** depois de teres utilizador no Mayan, podes testar `POST …/api/v4/auth/token/obtain/` (ver documentação Mayan).

---

## Problemas comuns

- **Mayan reinicia em ciclo:** Postgres/Redis/Rabbit ainda não aceitam ligações ou `MAYAN_DOCKER_WAIT` com host/porta errados.  
- **502 no Railway:** confirma variável `PORT` injetada pelo Railway e healthcheck (pode precisar de mais tempo na primeira deploy — ver `docker/mayan/railway.toml`).

Quando o Mayan estiver a correr, segue [`docs/railway-setup.md`](railway-setup.md) para API + Web, ou o resto do `docker-compose.homologacao.yml` para tudo local.
