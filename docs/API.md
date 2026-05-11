# HTTP API (v1)

Base path: `/api/v1` (see `API_PREFIX` in backend settings).

## Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health/live` | Liveness |
| GET | `/health/ready` | Readiness |

## Kaiser Core (cognitive v1)

| Method | Path | Body / query | Description |
|--------|------|----------------|-------------|
| POST | `/chat` | JSON `{ "text", "session_id"?, "mode"?, "include_session_context"? }` | AI turn + **intent** + **Kaiser Instinct** assessment |
| POST | `/command` | JSON `{ "raw", "session_id"?, "mode"? }` | Command parse + instinct recommendation (no required LLM) |
| POST | `/mode` | JSON `{ "session_id"?, "mode" }` | Set personality mode; returns compact **status** + instinct |
| GET | `/status` | `?session_id=` | Cockpit tick + pilot profile + mecha compact + instinct |

### State engine — full telemetry (digital twin)

| Method | Path | Body / query | Description |
|--------|------|----------------|-------------|
| GET | `/telemetry` | `?session_id=`, `?advance_tick=` (default **true**) | Full-size twin projection (`MechaState` JSON-safe) for polling / WebSocket parity |
| POST | `/diagnostics` | JSON `{ "session_id"? }` | Runs diagnostic normalization (distinct from legacy `/cockpit/diagnostics`; same twin kernel behaviour) |
| POST | `/state/reset` | JSON `{ "session_id"? }` | Factory-reset snapshot + audit `state_input` event |
| POST | `/state/event` | JSON `{ "session_id"?, "event": "<TwinStateInputEvent>", "payload"? }` | Validated discrete simulation events (`SET_OPERATIONAL_POSTURE`, Scrander/Pilder, thermal sims, etc.) — **400** on illegal posture/payload |

Legacy **`/cockpit/*`** endpoints remain unchanged; cockpit chat likewise benefits from instinct metadata when populated.

## Kaiser Action Orchestration (`/moves`)

Canonical moves run through the **14-phase** execution batch (authorization, safety governor, telemetry gates, cinematic graph, simulated strike, telemetry mutation, VO, ops log, post-action analysis). **Simulation / training only.**

| Method | Path | Body / query | Description |
|--------|------|----------------|-------------|
| GET | `/moves` | `?extended=` (default **false**) — includes gates, telemetry coefficients, animation cue graph when **true** | Catalogue + `batch_execution_phases` |
| GET | `/moves/{move_id}` | `?extended=` (default **true**) | Single move definition; `move_id` is kebab-case (e.g. `rocket-punch`, `glacial-beam-reito-beam`; aliases `reito-beam`, `glacial-beam` for Glacial / Reito) |
| POST | `/moves/{move_id}/simulate` | JSON `{ "session_id"?, "mode"?, "pilot_authorized"?, "strict_safety"? }` | Same batch engine as `/cockpit/move-demo`; returns `move_id`, `canonical_name`, `state`, **`cinematic_scale_profile`**, `move_batch`, `disclaimer` |
| POST | `/moves/recommend` | JSON `{ "session_id"?, "limit"?, "mode"? }` | Ranked playable moves from current twin telemetry + tactical hint |

Pilot **sync tiers** (`pilot_sync_pct` bands): **0–20% RESTRICTED**, **21–50% ASSISTED**, **51–80% COMBAT_READY**, **81–99% KAISER_SYNC**, **100%+ OVERDRIVE_RISK**. Move unlocks combine these tiers with **`GET/POST /pilder`** and **`POST /pilot/sync`** via the **`authorization_check`** step in each move batch (Pilder docked, pilot recognition VERIFIED, not `SHUTDOWN_SAFE`, required tier vs move definition).

## Kaiser Pilder & pilot synchronization

Simulation-only docking, pilot stress, biometric confidence, emergency separation, safe shutdown protocol, and **command authority** (`RESTRICTED` … `OVERDRIVE_WAIVER_REQUIRED` / `SAFE_SHUTDOWN` / `OBSERVE_ONLY`). Full envelope is also projected on **`GET /telemetry`** (`pilot_sync_pct`, `pilot_stress_pct`, `pilot_recognition_status`, `pilot_biometric_confidence_pct`).

### Pilder

| Method | Path | Body / query | Description |
|--------|------|----------------|-------------|
| POST | `/pilder/dock` | JSON `{ "session_id"?, "sync_boost_pct"?, "recognize_pilot"? }` | Dock sequence (`SYNCING` → `DOCKED`): raises pilot sync, optional biometric verify |
| POST | `/pilder/undock` | JSON `{ "session_id"?, "emergency"? }` | Undock (`SEPARATED`); emergency path spikes stress / drops pilot link |
| GET | `/pilder/status` | `?session_id=` | Pilder + pilot tiers + cockpit telemetry slice + tier band legend |

### Pilot

| Method | Path | Body / query | Description |
|--------|------|----------------|-------------|
| POST | `/pilot/sync` | JSON optional fields (see OpenAPI `/docs`): calibration targets/deltas, `alleviate_stress`, **`initiate_safe_shutdown`**, **`recognize_pilot`** | Calibration / stress; response includes **`cinematic_scale_profile`**; **`initiate_safe_shutdown: true`** runs safe shutdown protocol |
| GET | `/pilot/profile` | `?session_id=` | Session pilot display + twin link fields merged for HUD assistants |

## Cockpit

| Method | Path | Body / query | Description |
|--------|------|----------------|-------------|
| POST | `/cockpit/chat` | JSON `{ "text", "session_id"?, "mode"? }` | AI turn (REST); safety + LLM |
| GET | `/cockpit/state` | `?session_id=` | Latest HUD JSON + **`cinematic_scale_profile`** (32 m / 280 t cinematic chassis) |
| POST | `/cockpit/mode` | JSON `{ "session_id"?, "mode" }` | Set personality mode; response includes **`cinematic_scale_profile`** |
| POST | `/cockpit/diagnostics` | `?session_id=` | Normalize simulated telemetry; response includes **`cinematic_scale_profile`** |
| POST | `/cockpit/move-demo` | JSON `{ "session_id"?, "move": "<KaiserMove>" }` | Returns **`cinematic_scale_profile`**, `state`, and `move_batch` (14-phase execution report, VO line, animation plan) |
| GET | `/cockpit/tactical` | — | Notional tactical snapshot |

### Session configuration (wake stripping)

| Method | Path | Query / body | Description |
|--------|------|--------------|-------------|
| GET | `/cockpit/session` | `?session_id=` | Pilot fields + wake-prefix policy |
| PUT | `/cockpit/session` | `?session_id=`, JSON body | Update `wake_strip_enabled`, `wake_prefixes`, or pilot display fields |

The cockpit Mazinkaiser SKL viewport uses a **bundled GLB** from `frontend/public/models/mazinkaiser-skl.glb` (or `VITE_KAISER_GLB_URL`; optionally synced from repo root via `frontend`’s `sync:skl-glb` script before dev/build — no session `avatar_data_url` lane).

### Digital twin

| Method | Path | Query / body | Description |
|--------|------|--------------|-------------|
| GET | `/cockpit/twin/events` | `?session_id=`, `?limit=` | Recent twin timeline events (moves, diagnostics, directives) |
| POST | `/cockpit/twin/directive` | JSON `{ "session_id"?, "directive": "<SimulationDirective>" }` | Execute a systemic twin directive (simulation-only) |

`SimulationDirective` enum values include `THERMAL_EMERGENCY_FLUSH`, `SHUNT_AUX_TO_PHOTON`, `SYNC_RECALIBRATED`, etc. See OpenAPI `/docs`.

## Voice (interaction layer)

Provider-agnostic shell: **browser STT** submits text (`source: browser_webspeech`), **Whisper/TTS** are reserved via settings (`voice_stt_provider`, `voice_tts_provider`). Normalization delegates to cockpit wake stripping + heuristic parse.

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/voice/ingest` | JSON `{ "transcript", "session_id"?, "locale"?, "source"?, "execute_turn"?, "mode"?, "include_session_context"? }` | Validate transcript, return `normalized_text`, `parsed`, optional `tts_hints`; set `execute_turn: true` to run one cognitive REST turn inline |
| POST | `/voice/stream` | JSON `{ "text", "session_id"?, "mode"?, "include_session_context"? }` | SSE stream: simulated token chunks (`type: meta` \| `token` \| `done`); substitute for streamed LLM later |

REST body models: `VoiceIngestRequest`, `VoiceStreamRequest` (OpenAPI `/docs`). When `execute_turn` is omitted or false the cockpit SPA typically sends the **`normalized_text` over WebSocket** `chat` so tokens still flow as `assistant_token` / `assistant_done` for subtitles + browser TTS timing.

### Example: chat

```http
POST /api/v1/cockpit/chat
Content-Type: application/json

{
  "text": "Kaiser, initiate diagnostics.",
  "session_id": "optional-uuid-from-prior-response",
  "mode": "ENGINEER_MODE"
}
```

Response: `{ "session_id", "reply", "safety", "mode" }`.

---

## WebSocket — `/ws/cockpit`

Optional query: `?session_id=` to reattach.

### Client → server

```json
{ "type": "chat", "text": "Pilot recognized.", "mode": "PILOT_ASSIST_MODE" }
```

```json
{ "type": "ping" }
```

### Server → client

- `session` — initial `{ "session_id", "state" }`
- `state` — periodic HUD refresh
- `assistant` — full reply metadata
- `assistant_token` — chunked tokens (subtitle stream; concatenate for display)
- `assistant_done` — end of assistant stream (client uses this edge to cue **browser TTS** once, after tokens finish)
- `pong` — ping reply
- `error` — parse or protocol errors

OpenAPI: start the backend and browse `/docs`.
