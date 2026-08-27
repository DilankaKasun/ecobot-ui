# CLAUDE.md

Guidance for working in this repo.

## What this is

`ecobot-dashboard-nextjs` — a **Next.js 14 (App Router) + TypeScript + Tailwind** remote
operator dashboard for the **EcoBot** autonomous mobile manipulator. It runs on any
PC/laptop/host (not on the robot's Jetson) and talks to the robot over:

- **rosbridge WebSocket** (`ws(s)://<host>:9090`) via `roslib` — telemetry, teleop, services
- **LiveKit Cloud** (WebRTC) — low-latency camera video
- **MJPEG HTTP streams** on the Jetson (ports 8081/8083/8084/8085) — camera fallback

## Commands

```bash
npm install
npm run dev      # http://localhost:3001  (NOTE: 3001, not 3000 — README is stale)
npm run build    # production build; also the CI/type gate
npm run start    # serve production build on :3001
npm run lint     # next lint
```

There is **no test suite**. `npm run build` is the only correctness gate — run it before
declaring a change done (it runs `tsc` + eslint).

Connect to a robot by URL param: `http://localhost:3001?robot=192.168.1.150`
(also `?stream=<host>`, `?mode=observer`). `?robot=mock` enables offline mock data.

## Architecture

### Providers (both in `src/app/layout.tsx`, both client-side)
- **`RosProvider`** (`src/hooks/useRos.tsx`) — owns the single `ROSLIB.Ros` connection.
  Exposes `publish`, `subscribe`, `callService`, connection state, `robotHost`/`streamHost`,
  and `operatorMode`. Host is resolved from URL param → localStorage → env → default.
  - **Mock mode** (`robotHost === 'mock'`): `subscribe`/`publish`/`callService` are faked
    with `setInterval` generators inside `useRos.tsx` — no network.
  - **Observer mode**: `publish` is silently blocked (read-only operator).
  - `detections` (YOLOv8 results from `/ecobot/detections`, a JSON string topic) is
    subscribed globally here and shared via context.
- **`LiveKitProvider`** (`src/hooks/useLiveKit.tsx`) — connects to LiveKit room, auto-mints
  a token from `/api/livekit-token` if none supplied, and classifies incoming video tracks
  into `mainCameraTrack` / `wristCameraTrack` / `detectionOverlayTrack` by track name.

### Feature hooks (`src/hooks/`)
One hook per subsystem, each wrapping `useRos().subscribe`/`publish` for specific topics:
`useOdometry`, `useArmStatus`, `useArmControl`, `useTeleop`, `useToFSensors`,
`useHardwareDiagnostics`, `useDetections`, `usePlantMission`. Follow this pattern for new
robot data — don't call `subscribe` directly from components.

### Routes (`src/app/*/page.tsx`)
| Path | Purpose |
|---|---|
| `/` | Main HUD: background camera feed, 2D map, telemetry, teleop/perception/diagnostics drawers |
| `/arm` | Manipulator studio — joint sliders, FK/IK (`src/lib/kinematics.ts`), VLA prompt |
| `/map3d` | Three.js point-cloud / SLAM viewer |
| `/mission` | Autonomous multi-waypoint plant-scan mission manager |
| `/settings` | Robot host, stream host, LiveKit URL/room/token config |

### Camera feeds (`src/components/video/`)
`CameraFeed.tsx` is the reusable feed component. It has **three stream modes** with
automatic fallback, toggled in its header:
1. `livekit` — `<LiveKitVideoPlayer>` on a `RemoteTrack` (preferred, auto-selected when available)
2. `ros_topic` — base64 `CompressedImage` over the rosbridge socket (`<img>` data URL)
3. `http` — direct MJPEG `<img src=...>` via `resolveStreamUrl()` (default)

`resolveStreamUrl()` (exported from `CameraFeed.tsx`) handles tunnel hosts
(cloudflare/ngrok/vercel), explicit ports, and http→https upgrades. The main HUD in
`src/app/page.tsx` re-implements this fallback inline rather than using `<CameraFeed>`.

### ROS contract
All topic/port/service names live in **`src/lib/ros-config.ts`** (`ROS_CONFIG`). Add new
ones there, never inline string literals. Robot-side custom messages are usually
`std_msgs/String` carrying JSON (parsed in the hook).

## Conventions

- **Every component is `'use client'`** — this dashboard has essentially no server components
  beyond the two API routes. Data is realtime, not SSR.
- Path alias **`@/*` → `src/*`**.
- **Dark theme only** (`<html class="dark">`). Tailwind custom tokens in `tailwind.config.js`:
  `background`, `card`, `card-border`, `primary` (#00E5C0 teal), `danger`, `warning`,
  `success`, `purple`. Use these, not raw hex.
- Icons: `lucide-react`.
- State persistence: `localStorage` keys prefixed `ecobot_` (host, stream host, livekit_*, operator_mode).
- Styling is utility-classes-in-JSX; no CSS modules. `clsx` + `tailwind-merge` available.

## Gotchas

- **`tsconfig.json` target is `es5`** → no `for...of` over iterators/`Map`/`Set`/regex
  `matchAll`, no downlevel-iteration. Use indexed loops or `Array.from`.
- **Mixed content**: if the dashboard is served over HTTPS it cannot open `ws://` or
  `http://` MJPEG to a LAN IP. `useRos.tsx` / `resolveStreamUrl` try to detect this and
  surface a warning; test robot features over plain HTTP or via a `wss://` tunnel.
- Dev server binds `-H 0.0.0.0 -p 3001` (LAN-accessible). Port **3001** everywhere except
  the Dockerfile/README which still say 3000.
- `next.config.js` stubs `canvas`/`fs`/`net`/`tls` to `false` for the browser bundle
  (Three.js / roslib deps). Don't import Node built-ins into client code.
- `reactStrictMode: false` — effects run once; don't rely on double-invoke to catch bugs.
- `scripts/ros2_livekit_bridge.py` is a robot-side helper (publishes camera tracks to
  LiveKit), not part of the Next build.

## Environment (`.env.local`)

```
LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET / LIVEKIT_ROOM   # server, for /api/livekit-token
NEXT_PUBLIC_LIVEKIT_URL / NEXT_PUBLIC_LIVEKIT_ROOM                  # client defaults
NEXT_PUBLIC_DEFAULT_ROBOT_HOST / NEXT_PUBLIC_DEFAULT_STREAM_HOST    # optional
```
`.env.local` is gitignored and holds live secrets — don't commit it or echo its contents.
