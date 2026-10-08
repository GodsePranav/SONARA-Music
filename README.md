# SONARA

SONARA is an original music streaming app foundation. It uses licensed catalog sources and user-owned uploads only. Catalog import and audio playback are intentionally introduced in later phases; the local song files from the legacy project are not included in the SONARA catalog.

## Current phase

Phase 1 establishes the monorepo, local services, the Figtree design system, account flows, and responsive app shell. The player controls are present as shell UI; the audio engine arrives in Phase 2.

## Static UI design preview

<table width="100%" cellpadding="12" cellspacing="0" border="0">
  <tr>
    <td colspan="2" align="left"><strong>◉ SONARA</strong> &nbsp;&nbsp;&nbsp; <code>⌕ &nbsp; What do you want to play?</code> <span>&nbsp;&nbsp;&nbsp; ⌂ Home &nbsp; · &nbsp; ⌕ Search &nbsp; · &nbsp; Profile ◉</span></td>
  </tr>
  <tr>
    <td width="220" valign="top">
      <strong>YOUR LIBRARY</strong><br /><br />
      <code>Playlists</code> &nbsp; Artists &nbsp; Albums<br /><br />
      💚 &nbsp; <strong>Liked Songs</strong><br />&nbsp;&nbsp;&nbsp;&nbsp; Playlist · You<br /><br />
      🟧 &nbsp; <strong>Daily Mix 01</strong><br />&nbsp;&nbsp;&nbsp;&nbsp; Made for you<br /><br />
      🟩 &nbsp; <strong>Evening Focus</strong><br />&nbsp;&nbsp;&nbsp;&nbsp; Playlist · You<br /><br />
      🟪 &nbsp; <strong>Fresh Finds</strong>
    </td>
    <td valign="top">
      <small>YOUR PERSONAL LISTENING SPACE</small>
      <h1>Good evening.</h1>
      <p>Your next favorite is closer than you think.</p>
      <p><code>● Find your sound</code></p>
      <br />
      <strong>QUICK ACCESS</strong>
      <table width="100%" cellpadding="8" cellspacing="6" border="0">
        <tr>
          <td>💚 &nbsp; Liked Songs &nbsp; <code>▶</code></td>
          <td>🟧 &nbsp; Daily Mix 01 &nbsp; <code>▶</code></td>
          <td>🟩 &nbsp; Evening Focus &nbsp; <code>▶</code></td>
        </tr>
        <tr>
          <td>🟪 &nbsp; Fresh Finds &nbsp; <code>▶</code></td>
          <td>🟦 &nbsp; Soft Focus &nbsp; <code>▶</code></td>
          <td>🟨 &nbsp; On repeat &nbsp; <code>▶</code></td>
        </tr>
      </table>
      <br />
      <table width="100%" cellpadding="6" cellspacing="0" border="0">
        <tr><td><h2>Made for your day</h2></td><td align="right"><small>SHOW ALL</small></td></tr>
      </table>
      <table width="100%" cellpadding="8" cellspacing="6" border="0">
        <tr>
          <td>🎨<br /><br /><strong>Daily Mix 01</strong><br /><small>A little of everything</small></td>
          <td>🌊<br /><br /><strong>Soft Focus</strong><br /><small>Calm sounds for today</small></td>
          <td>✨<br /><br /><strong>Fresh Finds</strong><br /><small>New music picked for you</small></td>
          <td>🌙<br /><br /><strong>Late Night</strong><br /><small>A playlist for the ride</small></td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td colspan="2" align="center">🎵 &nbsp; <strong>Quiet Motion</strong> · Aster Vale &nbsp;&nbsp;&nbsp;&nbsp; ⤨ &nbsp; ◀ &nbsp; <code>▶</code> &nbsp; ▶ &nbsp; ↻ &nbsp;&nbsp;&nbsp;&nbsp; ━━━━━●━━━ &nbsp;&nbsp; 🔊</td>
  </tr>
</table>

<div align="center"><sub>Static SONARA interface preview · Audio playback is still in development</sub></div>

## Run locally

Requirements: Node.js 22+, npm 10+, and Docker Compose v2.

```sh
docker compose up --build
```


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
