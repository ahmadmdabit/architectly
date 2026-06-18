# Architectly

AI-powered, interview-driven BRD/PRD generator. Client-only, 100% TypeScript/HTML5/SCSS.

## Stack

- **TypeScript** (strict, ES2022 target)
- **Vite** (hybrid build: app shell + lazy chunks for PDF/DOCX/i18n)
- **Puter.js** (`openai/gpt-oss-120b:free`) for AI
- **i18next** (en/tr/ar with RTL)
- **marked + DOMPurify** for safe Markdown rendering
- **jspdf + docx** for exports
- Self-hosted Inter font
- No JavaScript or CSS frameworks

## Scripts

```bash
yarn install
yarn dev          # local dev server
yarn typecheck    # tsc --noEmit
yarn lint         # eslint
yarn build        # tsc check + vite build
yarn preview      # serve dist/
yarn deploy       # build + push to gh-pages branch
```

## Architecture

Layered, signal-based reactive state, History API routing with GitHub Pages SPA shim.

```
src/
├── main.ts                Bootstrap: i18n → store → router → host
├── types.ts               Shared types
├── core/                  signal, store, selectors, eventBus, result
├── services/
│   ├── ai/                Puter wrapper, prompt builders
│   ├── interview/         Question banks + engine
│   ├── markdown/          render, sections, html↔md round-trip
│   ├── storage/           localStorage (session) + IndexedDB (library)
│   └── export/            md, html, pdf, docx, clipboard, print, filename
├── router/                History API + sessionStorage SPA-shim restore
├── i18n/                  i18next + en/tr/ar JSON locales
└── ui/
    ├── shell/             header + footer + lang switch
    ├── components/        toast, modal, banner, progress, inputs, focusTrap
    └── views/             welcome, interview, generating, result, library
```

### Routes

- `/`           Welcome
- `/interview`  Active interview
- `/generating` AI streaming
- `/result`     Generated document (edit/refine/export)
- `/library`    Up to 100 saved documents (search/open/resume/rename/delete/export)

### State management

`core/signal.ts` implements minimal `signal()`, `computed()`, `effect()` primitives (SolidJS-style). `core/store.ts` exposes typed signals for `step`, `docType`, `history`, `currentQuestion`, `document`, `isBusy`, `error`, `lang`, etc. Views subscribe to only the signals they read.

### Persistence

- **localStorage** (`@/services/storage/session.ts`): in-flight interview, draft, settings (lang, showStepDots).
- **IndexedDB** (`@/services/storage/library.ts`): up to 100 saved documents with full interview history; FIFO eviction on overflow.

### Security

- Production CSP forbids `'unsafe-inline'` for scripts. Inline styles allowed (Vite-injected, scoped).
- DOMPurify hardened: no `style`, no `class` outside an allow-list; links forced to `rel="noopener noreferrer nofollow" target="_blank"`.
- Every Puter.js call gated by an `AbortController` that is cancelled on route change.

### Accessibility (WCAG 2.1 AA)

- Semantic landmarks (`header`, `main`, `nav`, `footer`).
- Focus trap in modals (`@/ui/components/focusTrap.ts`).
- `aria-live` regions for toasts and streaming status.
- All interactive elements keyboard-reachable; visible focus rings via `:focus-visible`.
- Color contrast on dark theme passes AA for body text and primary buttons.

### Internationalization

- `en`, `tr`, `ar` JSON dictionaries lazily loaded by `i18next-http-backend`.
- Active language drives `<html dir>` and `<html lang>`.
- AI prompts and AI output respect the active locale; filenames preserve Unicode (sanitized for the filesystem).
- RTL handled by `styles/utilities/_v-rtl.scss` with `[dir="rtl"]` overrides.

## GitHub Pages deployment

`vite.config.ts` sets `base: "/architectly/"` in production. `public/404.html` is the SPA shim that preserves deep links across the GH Pages 404 fallback by stashing the original path in `sessionStorage`; the router restores it on boot.

## License

MIT © 2026 Ahmet Fatihoğlu
