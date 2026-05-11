# Frontend — cockpit shell

Vite + React 19 + TypeScript + Tailwind CSS v4 + Framer Motion.

## Cockpit-oriented layout

| Path | Role |
|------|------|
| `src/components/cockpit/` | Shell, command deck, layout chrome |
| `src/components/hud/` | Telemetry bars, tactical readouts |
| `src/avatar/` | Presentation resolver + cockpit avatar views (see **`docs/CINEMATIC_AVATAR.md`**) |
| `src/hooks/` | `useCockpitWs` and other session hooks |
| `src/lib/` | HTTP client (`api.ts`), shared utilities |
| `src/state/` | UI/session state patterns |
| `src/voice/` | Web Speech API integration |
| `src/animations/` | Motion presets, transitions |
| `src/config.ts` | Build-time API base URL |

## Commands

```bash
npm install
npm run dev      # http://localhost:5173 — proxies /api and /ws to backend :8000
npm run build
npm run lint
```

See root **`README.md`** and **`docs/TECH_SPEC.md`**.
