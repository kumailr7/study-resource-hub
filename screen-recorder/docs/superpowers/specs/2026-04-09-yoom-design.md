# Yoom — Loom Clone Design Spec

## Overview

Yoom is a personal screen recording tool. Record your screen, camera, or both, then get a shareable link. No database — videos go straight to Cloudflare R2. Only the owner can record (password-protected); anyone with the link can watch.

## Routes

| Route | Type | Purpose |
|---|---|---|
| `/` | Page | Password gate → recording UI |
| `/watch/[key]` | Page | Public video player |
| `/api/upload` | API Route | Validates password, returns presigned R2 PUT URL |

## Recording Flow

1. User lands on `/` → password input screen
2. Password checked against `UPLOAD_PASSWORD` env var via API call
3. Authenticated state held in React state (not persisted)
4. Recorder UI shows:
   - **Mode selector**: Screen / Camera / Screen + Camera
   - **Device selectors**: microphone dropdown, camera dropdown (shown when relevant)
   - Start Recording button
5. On start:
   - **Screen mode**: `getDisplayMedia({ video: true, audio: true })`
   - **Camera mode**: `getUserMedia({ video: true, audio: true })`
   - **Screen + Camera mode**: `getDisplayMedia()` for screen + `getUserMedia()` for webcam overlay (picture-in-picture)
6. During recording: elapsed timer + Stop button
7. On stop: `MediaRecorder` produces a webm blob
8. App calls `POST /api/upload` with password in header → receives `{ presignedUrl, key }`
9. Browser PUTs the blob directly to R2 via presigned URL
10. On upload complete: shows shareable link `{NEXT_PUBLIC_APP_URL}/watch/{key}` with copy-to-clipboard button

## API Route — `/api/upload`

- Method: `POST`
- Auth: `UPLOAD_PASSWORD` sent in request header, validated server-side
- Generates UUID-based key: `{uuid}.webm`
- Creates presigned PUT URL for R2 (10-minute expiry)
- Returns: `{ presignedUrl, key }`
- Uses `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (R2 is S3-compatible)

## Watch Page — `/watch/[key]`

- Server component
- Constructs video URL from R2 public bucket URL + key
- Renders a centered video player with native `<video>` controls
- Dark background, clean layout
- Copy-link button
- 404 state if key doesn't exist in R2

## Device Selection

- `navigator.mediaDevices.enumerateDevices()` to list available devices
- Microphone dropdown: filters for `audioinput` devices
- Camera dropdown: filters for `videoinput` devices
- Screen source: handled by the browser's native picker (not customizable)
- Device selections used as constraints in `getUserMedia()` / `getDisplayMedia()`

## Screen + Camera Mode

- Screen captured via `getDisplayMedia()`
- Camera captured via `getUserMedia()` simultaneously
- Camera feed rendered as a small overlay (picture-in-picture) on the recording preview
- Both streams composited into a single recording using a `<canvas>` element and `canvas.captureStream()`, or recorded as the screen stream with camera overlay rendered in the player
- Decision: use canvas compositing so the output is a single video file with the webcam baked in

## UI Design

- **Style**: Linear-inspired, dark mode only
- **Framework**: Tailwind CSS
- **Aesthetic**: Clean, minimal, monochrome with subtle accents
- Will use the `frontend-design` skill during implementation for polished visuals

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`
- No database, no ORM, no auth library

## Environment Variables

```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=          # e.g., https://pub-xxx.r2.dev
UPLOAD_PASSWORD=        # password to access the recorder
NEXT_PUBLIC_APP_URL=    # e.g., https://yoom.example.com
```

## No-Limits Policy

- No recording time limit
- No file size limit
- Presigned URL handles direct browser-to-R2 upload, so server is never a bottleneck

## Access Control

- Recording: password-protected (single shared password from env var)
- Watching: fully public, anyone with the link can view
- No user accounts, no sessions, no tokens
