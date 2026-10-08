# SONARA

SONARA is an original music streaming app foundation. It uses licensed catalog sources and user-owned uploads only. Catalog import and audio playback are intentionally introduced in later phases; the local song files from the legacy project are not included in the SONARA catalog.

## Current phase

Phase 1 establishes the monorepo, local services, the Figtree design system, account flows, and responsive app shell. The player controls are present as shell UI; the audio engine arrives in Phase 2.

## Run locally

Requirements: Node.js 22+, npm 10+, and Docker Compose v2.

```sh
docker compose up --build
```

Open the web app at http://localhost:5173. The API health endpoint is http://localhost:4000/health. MongoDB, Redis, MinIO, and Meilisearch are available on ports 27017, 6379, 9000/9001, and 7700. Local development uses non-production credentials from `compose.yaml`.

For host-based frontend/API development, copy `.env.example` to `.env`, start MongoDB and Redis (or use Compose services), then run:

```sh
npm install
npm run dev
```

To preview signup and login without Docker or local MongoDB/Redis, start the web and API in separate terminals with `npm run dev -w @sonara/web` and `npm run dev:preview -w @sonara/api`. Preview-mode account data is temporary and clears when the API stops; use Compose for persistent local accounts.

Password reset URLs are delivered through SMTP when configured. In local development without SMTP, the one-time reset URL is logged by the API process. Production must set a real SMTP provider and strong secret values.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

## Repository map

- `apps/web` — React, TypeScript, Vite, Tailwind, app shell and auth screens.
- `apps/api` — Express, TypeScript, MongoDB models, Redis connection and account API.
- `packages/contracts` — shared Zod request and session schemas.
- `compose.yaml` — local app and infrastructure services.
- `.env.example` — local environment variable reference; never put real credentials here.

## Rights and uploads

Every playable catalog record must include verified source and license metadata. Do not import or serve the legacy audio files without documented streaming rights. User uploads are private until ownership, type, and size validation and media processing have completed.

## Phase 1 checklist

- [x] React/TypeScript workspaces and shared Zod contracts
- [x] Mongo-backed users, password hashes, rotating refresh sessions, reset tokens
- [x] Sign up, log in, refresh, log out, forgot/reset password API routes
- [x] Editable profile name and account preferences for quality, autoplay, crossfade, normalization, explicit filtering, language, and privacy
- [x] Figtree and original SONARA visual identity
- [x] Responsive three-pane shell, resizable sidebar, mobile navigation, player bar
- [x] Compose services for web, API, MongoDB, Redis, MinIO, and Meilisearch
- [x] CI workflow for typecheck, lint, unit tests, and build
- [ ] Avatar upload through the signed MinIO/S3 upload flow
- [ ] Functional streaming/player engine and catalog
- [ ] SMTP credentials and production deployment secrets
