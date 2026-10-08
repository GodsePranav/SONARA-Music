# SONARA

SONARA is an original music streaming app foundation. It uses licensed catalog sources and user-owned uploads only. Catalog import and audio playback are intentionally introduced in later phases; the local song files from the legacy project are not included in the SONARA catalog.

## Current phase

Phase 1 establishes the monorepo, local services, the Figtree design system, account flows, and responsive app shell. The player controls are present as shell UI; the audio engine arrives in Phase 2.

## Static UI design preview

<table width="100%" cellpadding="12" cellspacing="0" border="0" style="width:100%; border-collapse:separate; border-spacing:8px; color:#ffffff; background-color:#000000;">
  <tr>
    <td colspan="2" align="left" style="padding:16px 20px; background-color:#121212; border-radius:8px;"><strong style="font-size:20px; letter-spacing:2px;">◉ SONARA</strong> &nbsp;&nbsp;&nbsp; <code style="padding:10px 16px; color:#b3b3b3; background-color:#242424; border-radius:24px;">⌕ &nbsp; What do you want to play?</code> <span style="float:right; color:#b3b3b3;">⌂ Home &nbsp; · &nbsp; ⌕ Search &nbsp; · &nbsp; Profile ◉</span></td>
  </tr>
  <tr>
    <td width="220" valign="top" style="width:220px; padding:20px 16px; color:#b3b3b3; background-color:#121212; border-radius:8px;">
      <strong style="color:#ffffff; letter-spacing:1px;">YOUR LIBRARY</strong><br /><br />
      <code style="padding:6px 10px; color:#111111; background-color:#ffffff; border-radius:18px;">Playlists</code> &nbsp; Artists &nbsp; Albums<br /><br />
      <span style="display:block; padding:10px; color:#ffffff; background-color:#202020; border-radius:5px;">💚 &nbsp; <strong>Liked Songs</strong><br />&nbsp;&nbsp;&nbsp;&nbsp; Playlist · You</span><br />
      🟧 &nbsp; <strong style="color:#ffffff;">Daily Mix 01</strong><br />&nbsp;&nbsp;&nbsp;&nbsp; Made for you<br /><br />
      🟩 &nbsp; <strong style="color:#ffffff;">Evening Focus</strong><br />&nbsp;&nbsp;&nbsp;&nbsp; Playlist · You<br /><br />
      🟪 &nbsp; <strong style="color:#ffffff;">Fresh Finds</strong>
    </td>
    <td valign="top" style="padding:24px 30px; background-color:#14271c; border-radius:8px;">
      <small style="color:#c0d9c9; letter-spacing:1.5px;">YOUR PERSONAL LISTENING SPACE</small>
      <h1 style="margin:14px 0; color:#ffffff; font-size:48px;">Good evening.</h1>
      <p style="color:#d1d1d1;">Your next favorite is closer than you think.</p>
      <p><code style="padding:10px 17px; color:#07140b; background-color:#1ed760; border-radius:24px; font-weight:bold;">● Find your sound</code></p>
      <br />
      <strong style="color:#ffffff;">QUICK ACCESS</strong>
      <table width="100%" cellpadding="8" cellspacing="6" border="0" style="width:100%; border-collapse:separate; border-spacing:6px; color:#ffffff;">
        <tr>
          <td style="padding:10px; background-color:#242424; border-radius:5px;">💚 &nbsp; Liked Songs &nbsp; <code style="color:#1ed760;">▶</code></td>
          <td style="padding:10px; background-color:#242424; border-radius:5px;">🟧 &nbsp; Daily Mix 01 &nbsp; <code style="color:#1ed760;">▶</code></td>
          <td style="padding:10px; background-color:#242424; border-radius:5px;">🟩 &nbsp; Evening Focus &nbsp; <code style="color:#1ed760;">▶</code></td>
        </tr>
        <tr>
          <td style="padding:10px; background-color:#242424; border-radius:5px;">🟪 &nbsp; Fresh Finds &nbsp; <code style="color:#1ed760;">▶</code></td>
          <td style="padding:10px; background-color:#242424; border-radius:5px;">🟦 &nbsp; Soft Focus &nbsp; <code style="color:#1ed760;">▶</code></td>
          <td style="padding:10px; background-color:#242424; border-radius:5px;">🟨 &nbsp; On repeat &nbsp; <code style="color:#1ed760;">▶</code></td>
        </tr>
      </table>
      <br />
      <table width="100%" cellpadding="6" cellspacing="0" border="0" style="width:100%; color:#ffffff;">
        <tr><td><h2 style="color:#ffffff;">Made for your day</h2></td><td align="right"><small style="color:#b3b3b3;">SHOW ALL</small></td></tr>
      </table>
      <table width="100%" cellpadding="8" cellspacing="6" border="0" style="width:100%; border-collapse:separate; border-spacing:7px; color:#ffffff;">
        <tr>
          <td style="padding:12px; background-color:#181818; border-radius:6px;">🎨<br /><br /><strong>Daily Mix 01</strong><br /><small style="color:#b3b3b3;">A little of everything</small></td>
          <td style="padding:12px; background-color:#181818; border-radius:6px;">🌊<br /><br /><strong>Soft Focus</strong><br /><small style="color:#b3b3b3;">Calm sounds for today</small></td>
          <td style="padding:12px; background-color:#181818; border-radius:6px;">✨<br /><br /><strong>Fresh Finds</strong><br /><small style="color:#b3b3b3;">New music picked for you</small></td>
          <td style="padding:12px; background-color:#181818; border-radius:6px;">🌙<br /><br /><strong>Late Night</strong><br /><small style="color:#b3b3b3;">A playlist for the ride</small></td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td colspan="2" align="center" style="padding:16px; color:#ffffff; background-color:#181818; border-radius:8px;">🎵 &nbsp; <strong>Quiet Motion</strong> · Aster Vale &nbsp;&nbsp;&nbsp;&nbsp; ⤨ &nbsp; ◀ &nbsp; <code style="padding:7px 9px; color:#111111; background-color:#ffffff; border-radius:50%;">▶</code> &nbsp; ▶ &nbsp; ↻ &nbsp;&nbsp;&nbsp;&nbsp; <span style="color:#1ed760;">━━━━━●</span>━━━ &nbsp;&nbsp; 🔊</td>
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
