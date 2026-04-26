# Yoom

A personal screen recording tool with shareable links. Record your screen, camera, or both — get a link anyone can watch. Videos are stored on Cloudflare R2. No database needed.

Built with Next.js, React, TypeScript, and Tailwind CSS.

## Features

- **Three recording modes** — Screen only, Camera only, or Screen + Camera (picture-in-picture)
- **High quality** — Up to 4K/60fps screen capture, VP9 codec, 10 Mbps bitrate
- **Instant sharing** — Upload completes, you get a link
- **Password protected** — Only you can record; anyone with the link can watch
- **No database** — Videos go straight to Cloudflare R2

## Quick Start

```bash
git clone https://github.com/albertshiney/yoom_public.git
cd yoom_public
npm install
cp .env.example .env.local
# Fill in your values in .env.local (see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create a `.env.local` file from the example:

```
R2_ACCOUNT_ID=           # Your Cloudflare account ID
R2_ACCESS_KEY_ID=        # R2 API token access key
R2_SECRET_ACCESS_KEY=    # R2 API token secret key
R2_BUCKET_NAME=          # Your R2 bucket name
R2_PUBLIC_URL=           # Public URL for the bucket (custom domain or r2.dev)
UPLOAD_PASSWORD=         # Password to protect the recording interface
NEXT_PUBLIC_APP_URL=     # Your app URL (e.g. https://yoom.example.com)
```

## Deploy

### 1. Create an R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2 Object Storage** → **Create bucket**
2. Name it (e.g. `yoom-videos`)
3. Under the bucket's **Settings** tab:
   - Enable **Public access** — either via an `r2.dev` subdomain or a custom domain
   - Copy the public URL — this is your `R2_PUBLIC_URL`

### 2. Create R2 API Tokens

1. In R2 → **Manage R2 API Tokens** → **Create API Token**
2. Give it **Object Read & Write** permission for your bucket
3. Copy the **Access Key ID** and **Secret Access Key**

### 3. Get Your Account ID

Your **Cloudflare Account ID** is in the URL when you're in the dashboard (`dash.cloudflare.com/<account-id>/...`), or on the R2 overview page.

### 4. Deploy the App

You can deploy Yoom anywhere that runs Node.js:

#### Vercel (recommended)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Import Project**
3. Add all environment variables from `.env.example`
4. Deploy

#### Cloudflare Pages

1. Push this repo to GitHub
2. Go to Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → connect your repo
3. Build settings:
   - **Build command:** `npm run build`
   - **Output directory:** `.next`
4. Add environment variables in the Pages project settings
5. Deploy

#### Self-hosted

```bash
npm run build
npm start
```

Runs on port 3000 by default. Use a reverse proxy (nginx, Caddy) for HTTPS.

### 5. Set UPLOAD_PASSWORD

Choose a strong password. This protects the recording interface — anyone who visits your Yoom URL will need this password to record. Anyone with a video link can watch without a password.

### 6. Set NEXT_PUBLIC_APP_URL

Set this to your deployed URL (e.g. `https://yoom.example.com`). This is used to generate share links. If left empty, the app uses `window.location.origin` as a fallback.

## How It Works

1. User visits `/` → enters password
2. Picks recording mode (screen / camera / screen + camera)
3. Records using the browser's MediaRecorder API
4. On stop, the app requests a presigned R2 upload URL from the API
5. Video uploads directly to R2 from the browser
6. User gets a shareable `/watch/<uuid>` link
7. Anyone with the link can watch the video

## Tech Stack

- [Next.js](https://nextjs.org) — App Router, API routes
- [React](https://react.dev) — UI
- [Tailwind CSS](https://tailwindcss.com) — Styling
- [Cloudflare R2](https://developers.cloudflare.com/r2/) — Video storage (S3-compatible)
- [@aws-sdk/client-s3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/) — R2 client

## License

MIT
