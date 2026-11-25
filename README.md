# imageishere Console

Interactive web console, live Telegram chat simulator, deployment runbook, health monitor, and operator toolkit for the [**@imageishere_bot**](https://t.me/imageishere_bot) AI image-generation Telegram bot.

> **Note:** This repository contains the **frontend web console** (`imageishere-console`). The serverless Telegram webhook and Browserless/Perchance worker live in the companion bot repository: [`refatwashere/imageishere`](https://github.com/refatwashere/imageishere).

---

## Features

All views are deep-linkable via URL hashes and accessible from the sidebar or the **`⌘K` / `Ctrl+K`** command palette:

| View | Hash | Description |
|---|---|---|
| **Overview** | `#overview` | Architecture summary, prompt lifecycle flow, runtime stack, quickstart commands, and live webhook status. |
| **Live Simulator** | `#simulator` | Telegram-styled interactive chat with slash command menu, inline `@imageishere_bot` mode, callback buttons, Perchance `t2i-styles` prompt presets, aspect-ratio controls (`1:1`, `2:3`, `3:2`), Flux rendering, seed-incremented **Regenerate**, and `localStorage` persistence. |
| **Deploy Runbook** | `#runbook` | 8-step deployment checklist covering BotFather, Browserless, local polling, Vercel setup, and webhook verification (persisted in `localStorage`). |
| **Live Status** | `#status` | Real browser-side endpoint probes (Webhook, Website, Telegram Bot API, Browserless, Perchance, Pollinations, GitHub) with latency sparklines, HTTP contract table, and recent repository commits. |
| **Commands** | `#commands` | Searchable reference of all 9 bot commands, non-command behaviors, BotFather `/setcommands` snippets, callback mappings, and inline mode. |
| **Troubleshooting** | `#troubleshooting` | Triage checklist, 60-second reset procedure, and searchable issue accordion (`403`, `404`, missing env vars, Browserless timeouts, pending updates). |
| **Operator Tools** | `#tools` | Client-side `setWebhook` command generator (PowerShell / cURL / Node), 256-bit `WEBHOOK_SECRET` generator, direct browser-to-Telegram `getWebhookInfo` / `getMe` / `getMyCommands` / `deleteWebhook` inspector, and `.env` validator. |
| **Project Structure** | `#structure` | Live source browser that fetches files directly from `refatwashere/imageishere` on GitHub (`raw.githubusercontent.com`) with line numbers and one-click copy. |

---

## Tech Stack

- **Framework**: React 19 + TypeScript (`strict`, `noUnusedLocals`, `noUnusedParameters`)
- **Bundler**: Vite 7 + `vite-plugin-singlefile` (inlines JS/CSS into `dist/index.html`)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **Icons**: `lucide-react`

---

## Project Structure

```text
imageishere-bot/
├── public/
│   └── images/
│       ├── hero.jpg           # Overview hero artwork
│       └── mascot.jpg         # Bot avatar across sidebar & simulator
├── src/
│   ├── components/
│   │   ├── Brand.tsx          # Wordmark, SVG icons, status dots, sparklines
│   │   ├── CodeBlock.tsx      # Line-numbered code block with copy button
│   │   ├── Commands.tsx       # Bot commands & inline mode reference
│   │   ├── FileTree.tsx       # Upstream bot source tree & live file viewer
│   │   ├── Overview.tsx       # Hero, lifecycle diagram, stack & quickstart
│   │   ├── Runbook.tsx        # 8-step interactive deployment checklist
│   │   ├── Sidebar.tsx        # Responsive navigation & live webhook status card
│   │   ├── Simulator.tsx      # Interactive Telegram bot simulator
│   │   ├── Status.tsx         # Live health probes & GitHub commit feed
│   │   ├── Tools.tsx          # Webhook studio, Bot API inspector, .env validator
│   │   └── Troubleshooting.tsx# Triage guide & searchable error accordion
│   ├── data/
│   │   ├── content.ts         # Central bot specs, commands, env vars, troubleshooting
│   │   └── styles.ts          # Ported Perchance t2i-styles templates & ratios
│   ├── lib/
│   │   ├── bot.ts             # Client-side bot command, inline & image URL engine
│   │   ├── clipboard.ts       # Clipboard write helper with fallback & useCopy hook
│   │   └── live.ts            # Webhook health store, CORS/no-CORS probes, GitHub feed
│   ├── App.tsx                # Layout shell, hash router, ⌘K command palette
│   ├── index.css              # Tailwind v4 @theme tokens & custom animations
│   └── main.tsx               # React root mount
├── .editorconfig
├── .gitattributes
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vercel.json                # Vercel Vite build, SPA rewrites & asset caching
└── vite.config.ts
```

---

## Local Development

### Prerequisites

- **Node.js 18+** (tested on Node 24)
- **npm**

### Setup & Commands

```bash
# 1. Install dependencies from lockfile
npm ci

# 2. Start local Vite dev server (http://localhost:5173)
npm run dev

# 3. Type-check TypeScript
npm run typecheck

# 4. Build production bundle to dist/
npm run build

# 5. Preview the production build locally
npm run preview
```

---

## Pushing to GitHub

If this directory is not yet initialized as a Git repository:

```bash
git init
git branch -M main
git add .
git commit -m "Initial commit: imageishere console"
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

`.gitignore` excludes `node_modules/`, `dist/`, `.vercel/`, `.env*`, editor files, and `.private/`.

---

## Deploying to Vercel

This project includes a preconfigured [vercel.json](./vercel.json) for static Vite deployment (`dist/` output, SPA rewrites excluding `/api/`, `/images/`, and `/assets/`, and immutable caching headers for `/images/*`).

### Option 1: Vercel Dashboard (Recommended)

1. Push this repository to GitHub.
2. Open [vercel.com/new](https://vercel.com/new) and import the repository.
3. Vercel reads `vercel.json` automatically:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. No environment variables are required for this frontend console.
5. Click **Deploy**.

### Option 2: Vercel CLI

```bash
# Install or run Vercel CLI
npx vercel

# Deploy to production
npx vercel --prod
```

> **Tip:** When hosted on the same domain as the Telegram bot webhook (`imageishere.vercel.app`), the **Live Status** view reads the full JSON body from `GET /api/webhook` via same-origin requests; on other domains, it automatically falls back to an opaque reachability probe if CORS headers are absent.

---

## Credits

- **Developer**: [Robiul Islam Refat](https://github.com/refatwashere)
- **Bot Handle**: [@imageishere_bot](https://t.me/imageishere_bot)
- **Bot Backend Repo**: [github.com/refatwashere/imageishere](https://github.com/refatwashere/imageishere)
