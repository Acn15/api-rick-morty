# api-zrp

API NestJS que expõe episódios e personagens de Rick and Morty, com cache Redis, autenticação JWT (usuários) e integração HTTP encapsulada com a [Rick and Morty API](https://rickandmortyapi.com/).

Somente este backend chama a API externa. O frontend consome apenas esta API.

## Stack

- NestJS 11 + TypeScript
- Prisma + PostgreSQL
- Redis (`cache-manager` + `@keyv/redis`)
- Axios (`@nestjs/axios`) para a integração externa
- JWT híbrido (cookie httpOnly ou Bearer)
- Helmet, CORS, CSRF (configurável), compression
- Jest para testes unitários

## Pré-requisitos

- Node.js 24+
- Docker e Docker Compose (opcional; sobe API + Redis — **sem** Postgres local)
- Postgres gerenciado (Neon, Vercel Postgres, Supabase, etc.) para Prisma/auth
- npm

## Configuração

```bash
cp .env.example .env
```

Ajuste os valores do `.env`. Variáveis importantes:

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `JWT_SECRET` | Sempre | Segredo de assinatura/verificação JWT (sem fallback) |
| `CSRF_SECRET` | Quando CSRF está ligado | Segredo CSRF (sem fallback) |
| `DISABLE_CSRF` | Não | Em `true`, desliga CSRF (útil em dev) |
| `ENABLE_CSRF` | Não | Em dev, força CSRF com `true` |
| `RICK_AND_MORTY_API_BASE_URL` | Sim | Base URL da API externa |
| `REDIS_HOST` / `REDIS_PORT` | Sim | Conexão Redis |
| `EPISODES_CACHE_TTL_SECONDS` | Não (default 3600) | TTL do cache de episódios |
| `CHARACTERS_CACHE_TTL_SECONDS` | Não (default 3600) | TTL do cache de personagens |
| `DATABASE_URL` | Sim | Postgres externo via Prisma (não use o Postgres do Docker; está comentado) |
| `CORS_ORIGINS` | Recomendado em prod | Origens permitidas, separadas por vírgula |
| `PORT` | Não (default 3000) | Porta HTTP |

Em produção, CSRF fica ligado por padrão (`DISABLE_CSRF` diferente de `true`). Em desenvolvimento, CSRF fica desligado salvo `ENABLE_CSRF=true`.

## Subir com Docker (dev)

```bash
npm run docker:up
```

Sobe:

- API em `http://localhost:3000`
- Redis

**Postgres no Compose está comentado.** Configure `DATABASE_URL` no `.env` apontando para um banco externo antes de subir a API.

Para reativar o Postgres local no Docker, descomente `x-db-base`, `db-dev`/`db`, o volume `pg_data` e os `depends_on` de banco em `docker-compose.yml`.

Outros comandos:

```bash
npm run docker:logs
npm run docker:ps
npm run docker:down
```

Prisma (contra o banco externo):

```bash
npx prisma generate
npx prisma migrate deploy
# ou, em desenvolvimento:
npx prisma migrate dev
```

## Subir localmente

1. Configure `DATABASE_URL` (Postgres gerenciado) e Redis (`REDIS_HOST=localhost` se o Redis vier do Compose).
2. Instale e rode:

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

Produção (artefato compilado):

```bash
npm run build
npm run start:prod
```

A imagem Docker de produção executa `node dist/main.js` (não depende do `@nestjs/cli`).

## Endpoints principais

### Episódios (públicos)

| Método | Rota | Comportamento |
|--------|------|----------------|
| `GET` | `/episodes` | Lista paginada (`page` default `1`) |
| `GET` | `/episodes?search=...` | Busca por ID numérico ou nome |
| `GET` | `/episodes/:id/characters` | Personagens do episódio (ordenados por nome) |

Regras de busca em `/episodes`:

- `search` só com dígitos → busca por ID; `page` é ignorado (inclusive inválido)
- ID inexistente → `404`
- Nome sem resultados → `200` com `results: []`
- Página inexistente sem busca → `404`

### Personagens (públicos)

| Método | Rota | Comportamento |
|--------|------|----------------|
| `GET` | `/characters` | Lista paginada + filtros (`name`, `status`, `species`, `type`, `gender`) |
| `GET` | `/characters/:id` | Detalhe com `episodes: [{ id, name, episode, airDate }]` |

Regras:

- Filtros sem match → `200` com lista vazia
- Página inexistente sem filtros → `404`
- Personagem sem episódios → `episodes: []` (sem chamada extra)
- IDs de episódio deduplicados (primeira ocorrência), consultados em lote e devolvidos na ordem do personagem

### Auth e usuários

| Método | Rota | Auth |
|--------|------|------|
| `POST` | `/auth/login` | Público |
| `POST` | `/auth/refresh` | Público |
| `POST` | `/auth/logout` | JWT |
| `GET` | `/auth/profile` | JWT |
| `POST` | `/users` | Público (cadastro) |
| `GET` / `PATCH` / `DELETE` | `/users...` | JWT |

JWT aceita `Authorization: Bearer <token>` ou cookie `access_token`.

### Saúde

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/health` | Health check (Terminus) |

## Arquitetura (visão rápida)

```
Controller → Service (domínio) → RickAndMortyService (HTTP) + CacheService (Redis)
```

- Integração externa isolada em `src/integrations/rick-and-morty`
- Cache compartilhado em `src/infrastructure/redis-cache` (fail-open: falha de Redis não derruba a API)
- Erros externos viram `404` / `502` sem expor URLs da API de terceiros
- Timeout HTTP da integração: 8 segundos
- Em produção, erros 500 inesperados retornam mensagem genérica ao cliente

### Cache (exemplos de chaves)

- `episodes:list:v1:page:{page}`
- `episodes:search:v1:name:{name}:page:{page}`
- `episodes:search:v1:id:{id}`
- `episodes:{id}:characters`
- `characters:list:v1:page:{page}:...filtros`
- `characters:detail:v2:id:{id}`

Respostas inválidas ou erros de integração **não** são cacheados.

## Scripts úteis

```bash
npm run start:dev      # watch mode
npm run build
npm run start:prod
npm run lint
npm test
npm run test:episodes
npm run test:characters
npm run test:cov
npm run docs           # Compodoc em :8090
```

## Testes

Os testes unitários mockam a Rick and Morty API e o Redis; não dependem de serviços externos reais.

```bash
npm test
```

## Estrutura de pastas

```
src/
  auth/                 # login, JWT, guards
  users/                # cadastro e perfil
  episodes/             # listagem, busca, personagens do episódio
  characters/           # listagem, filtros, detalhe
  integrations/         # cliente Rick and Morty
  infrastructure/       # Redis / CacheService
  config/               # validação de segredos no boot
  common/               # filtros, decorators
  health/
  prisma/
```

## Licença

UNLICENSED — uso privado.
