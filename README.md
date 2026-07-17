<img width="3844" height="793" alt="banner" src="https://github.com/user-attachments/assets/eea692df-b300-45de-8acb-03ab75cfdf3c" />

> **Void Presence Web** – The website for [Void Presence](https://github.com/Devollox/void-presence): browse community configs, install plugins, manage your profile, and access the public API.

---

## Overview

Void Presence Web is a Next.js application that serves as the hub for the Void Presence ecosystem. It lets users browse and share Discord Rich Presence configs and custom statuses, discover and install community plugins, view release history, and authenticate via Discord or Steam.

---

## Pages

| Route | Description |
|---|---|
| `/` | Landing page |
| `/presence` | Browse community Rich Presence configs |
| `/presence/[id]` | Config details — preview, download JSON, copy to clipboard |
| `/statuses` | Browse community custom Discord statuses |
| `/statuses/[id]` | Status details — preview, download, copy |
| `/plugins` | Community plugins — browse and install with one click |
| `/plugins/docs` | Full plugin development documentation |
| `/profile` | Your profile — uploaded configs, Author ID |
| `/profile/[id]` | Public profile page |
| `/download` | Download Void Presence app, changelog |
| `/schedule` | Release history and download stats |
| `/docs` | General documentation |
| `/api` | Public API docs (v0, v1) |

---

## Features

- **Config browser** — search, filter, preview Discord presence cards, download or copy JSON
- **Status browser** — browse and preview custom Discord status cycles
- **Plugin registry** — one-click install via `voidpresence://install-plugin?url=…` deep link
- **Plugin docs** — full plugin development guide at `/plugins/docs`
- **Profile page** — view your uploaded configs, get your Author ID for cloud sync
- **Auth** — Discord + Steam OAuth via `next-auth`
- **Public REST API** — v0 and v1 endpoints for configs, authors, analytics
- **Release schedule** — download stats charts per release
- **Auto manifest** — `npm run build:manifest` generates `plugins/plugins-manifest.json` from source

---

## Tech stack

- **Next.js 16** (App Router, SSR + static)
- **TypeScript**
- **React 19**
- **Firebase** — config and profile storage
- **Upstash Redis** — auth session storage
- **next-auth v5** — Discord + Steam OAuth
- **SCSS** — custom styling, no UI framework
- **Recharts** — download stats charts
- **Vercel** — hosting and analytics

---

## Development

```bash
npm install
npm run dev
```

Build with manifest generation:

```bash
npm run build
# runs scripts/build-manifest.js first, then next build
```

Regenerate `plugins/plugins-manifest.json` only:

```bash
npm run build:manifest
```

Environment variables go in `.env.local` — see `.env.local` for required keys (Firebase, Redis, NextAuth, Steam).

---

## Plugin publishing

1. Add your `.js` file or folder to `plugins/`
2. Include `author`, `description`, `tags`, `preview.slides` in your export (or in `manifest.json` for folder plugins)
3. Open a PR to this repository
4. After merge, `npm run build:manifest` regenerates the manifest — your plugin appears on `/plugins` with a one-click install button

---

<img width="3844" height="302" alt="security" src="https://github.com/user-attachments/assets/f8ce7096-9d0a-4cd0-9ab5-e52b1e39204b" />

## Security & data

**What is stored:**
- Config data — button pairs, status cycles, image cycles (`buttonPairs`, `cycles`, `imageCycles`)
- Metadata — title, description, upload timestamp, download counter
- Author name — your display handle

**What is never stored:**
- Discord tokens, passwords, or OAuth keys
- Personal messages or Discord account data
- System files or arbitrary local data

---

<img width="3844" height="302" alt="author" src="https://github.com/user-attachments/assets/40ce01ee-a7e0-439e-b376-ad1974fbb5bf" />

Made with ❤️ by [Devollox](https://github.com/Devollox)

<p align="left">
  <img width="128" height="128" alt="avatar" src="https://github.com/user-attachments/assets/32b65183-a39c-4871-bb37-5fbe01ecaade" />
</p>

> **Void Presence** – Control your Discord presence. Own your story.
