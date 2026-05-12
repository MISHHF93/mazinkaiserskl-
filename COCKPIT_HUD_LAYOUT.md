# Cockpit HUD layout (gaming-ready IA)

This document describes the **information architecture** for the Mazinkaiser SKL cockpit after the 2026 HUD rebuild. It is the single reference for *where things live* and *what was merged or removed*.

## Design goals

1. **One clear “start / stop” for depth** — the 3D viewport stays readable; chrome explains itself in three horizontal zones, not nested drawers inside drawers.
2. **No duplicate command paths** — the bottom command bar is the only place to type and execute a directive. The side console never repeats the same textarea.
3. **Gaming HUD language** — status strip (always-on vitals), command bar (input + commit + voice), tactical console (everything else behind one door).
4. **Predictable navigation** — the console uses a **vertical rail** (Pilot · Combat · Hull) instead of three horizontal tabs that felt like “another app inside the app.”

## Viewer-first stage (maximum hull canvas)

- **App chrome** — the global header is **out of document flow** (`position: absolute`, high z-index). `<main>` is `flex-1` + `h-full` + `min-h-0`, so the SKL column receives **the full viewport height** of the cockpit shell; the header floats above the mesh instead of reserving a fixed strip.
- **Hull inner crop** — `inset-0` on hull surface (no extra inner margin) so the WebGL canvas uses the full rounded shell.
- **GLB inspector** — on hull surface, the toggle is a **floating chip** over the viewport; the report opens as a **slide-over sheet** (`top-[8%]` … `bottom-0`) so the 3D area is never shortened by a permanent footer row.
- **Overlays** — status strip and command deck stay `absolute` with tighter max-widths and translucency so the center of the frame reads as open space; SKL dock reserves slightly less horizontal margin so orbit gestures near the right edge stay natural.

## Screen zones (hull surface mode)

| Zone | Position | Contents |
|------|-----------|----------|
| **A — Status strip** | Top of viewport | Core vitals (photon, sync, thermal, armor) **always visible** (no “Gauges” toggle). Compact context: experience mode, twin semantic, tactical alert. **Console** opens the tactical console. |
| **B — Command deck** | Bottom-left | Waveform + Kaiser line + directive field + **Execute** + voice row (PTT · Mic · Voice). **Console** duplicates the top entry (opens same panel, Pilot section). |
| **C — Tactical console** | Slide-in panel (right) | Full-height sheet with **left rail** and scrollable body. Escape or backdrop closes. |
| **D — Viewer dock** | Bottom-right (WebGL) | Fit · expand settings · camera preset **dropdown** (replaces four separate preset chips) · fullscreen. Settings remain in the expandable sheet (View / Light / Mat / Face / Debug). |

## Tactical console — rail sections

### Pilot (`pilot`)

- Push-to-talk, mic tap, voice normalize (same wiring as the deck; for users who opened the console first).
- **Activity log** — live STT, assistant stream, transcript (always expanded list; no nested `<details>`).

### Combat (`combat`)

- Personality mode, wake gate, **Diagnose** (backend diagnostics), **Tactical** brief.
- **Test 3D hull animation** (cycle) + full move grid (unchanged behavior).

### Hull (`hull`)

- **Advisory and posture** — HUD mode, operational posture, last demo move, structural stress, alerts.
- *Intentionally no second row of the four core bars* — they live only in the status strip to avoid redundancy.

## Removed or simplified (vs previous build)

| Before | After |
|--------|--------|
| “Gauges” chip toggling the four core bars | Bars always on in the status strip |
| Separate **Diag** (top) and **Bus** (deck) opening overlapping concepts | Single **Console** control (top + deck) |
| Horizontal tabs Command / Combat / Twin | Vertical rail **Pilot / Combat / Hull** (same three areas, clearer names) |
| Full second directive form inside the console | Removed — use the deck field only |
| Activity log wrapped in `<details>` | Always visible in Pilot |
| SKL dock: four camera preset text buttons | One `<select>` for Cinematic / Diagnostic / Pilot / Move + fullscreen |
| Fixed header row consuming vertical flex space | **Floating header** — does not shrink `<main>`; hull stage is full height |
| GLB inspector footer under the canvas | **Floating chip + slide-over** — canvas column stays full height until overlay opens |

## Keyboard

- **Escape** — closes the tactical console when focused in the viewport layer.
- **Arrow keys** on the console rail tablist — previous / next section (unchanged pattern).

## Theming

Existing tokens (`--color-mzk-*`), `SIM_HUD_BEZEL_PANEL`, and angular deck styling are preserved so the cockpit still reads as Mazinkaiser chrome, not a generic web form.

## Files touched (implementation)

- `frontend/src/components/cockpit/HullInstrumentOverlay.tsx` — main rebuild.
- `frontend/src/components/cockpit/cockpitControls.tsx` — optional anchor / rail helpers.
- `frontend/src/components/cockpit/CinematicCockpit.tsx` — help copy under “Where are controls?”
- `frontend/src/avatar/view/SKLModelViewer.tsx` — collapsed camera row simplification.
- `frontend/src/avatar/view/ImageAvatarViewer.tsx` — slimmer GLB inspector affordance on hull surface.

## Future ideas (not in this pass)

- User-reorderable rail; gamepad focus order; bind Console to a physical key (for example backtick).
