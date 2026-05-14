# JPT Media Bot

AI-powered Slack bot that generates images & videos via PixelBin, then posts to Instagram, LinkedIn, Twitter/X, and YouTube — all from a single Slack message.

---

## What it does

1. **Tag `@JPT`** in any Slack channel with a generation prompt
2. Bot generates the media using **PixelBin AI** (NanoBanana Pro for images, Google Veo 3.1 for videos)
3. Media is delivered back in Slack with a **social sharing panel**
4. Select platforms, add an optional caption, hit **Post** — done

### Example commands
```
@JPT generate image of a neon-lit Tokyo street at midnight
@JPT generate video of a rocket launching into space
@JPT generate image showing a peaceful mountain lake at sunrise
```

---

## Architecture

```
Slack mention
     │
     ▼
/api/slack/events          ← Slack Events API webhook
     │  posts "generating…" message
     │  fires PixelBin prediction with webhook URL
     ▼
PixelBin AI
(NanoBanana / Veo3)
     │  async callback when done
     ▼
/api/pixelbin/webhook      ← Updates Slack message with media + sharing buttons
     │
     ▼  (user clicks Post)
/api/slack/interactions    ← Receives button/checkbox state
     │
     ▼
/api/social/post           ← Posts to selected platforms concurrently
```

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router) |
| Hosting | Vercel |
| Image gen | PixelBin — NanoBanana Pro |
| Video gen | PixelBin — Google Veo 3.1 Fast |
| CDN | PixelBin CDN |
| Slack | `@slack/web-api` |
| Social | Meta Graph API · LinkedIn API · Twitter API v2 · YouTube Data API v3 |

---

## Setup guide

### 1 — Deploy to Vercel

```bash
git clone https://github.com/YOUR_USERNAME/jpt-media-bot
cd jpt-media-bot
npm install
npx vercel --prod
```

Take note of your deployment URL, e.g. `https://jpt-media-bot.vercel.app`.

---

### 2 — Create the Slack App (JPT)

1. Go to **https://api.slack.com/apps** → **Create New App** → **From scratch**
2. Name: `JPT` · Select your workspace
3. **OAuth & Permissions** → Bot Token Scopes:
   - `app_mentions:read`
   - `chat:write`
   - `chat:write.public`
   - `files:write`
   - `channels:read`
4. **Install App** → copy **Bot User OAuth Token** (`xoxb-…`) → set as `SLACK_BOT_TOKEN`
5. **Basic Information** → **Signing Secret** → set as `SLACK_SIGNING_SECRET`
6. **Event Subscriptions** → Enable → Request URL:
   ```
   https://YOUR_APP.vercel.app/api/slack/events
   ```
   Subscribe to bot events: `app_mention`
7. **Interactivity & Shortcuts** → Enable → Request URL:
   ```
   https://YOUR_APP.vercel.app/api/slack/interactions
   ```
8. Reinstall the app to your workspace.

---

### 3 — Set environment variables on Vercel

In your Vercel project → **Settings → Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `PIXELBIN_API_TOKEN` | `b71301f0-d691-4690-8893-b92ea09a7fc8` |
| `PIXELBIN_ACCESS_KEY` | `bad9cd9a-5731-4131-9943-80c5bcc9f75d` |
| `SLACK_BOT_TOKEN` | `xoxb-…` |
| `SLACK_SIGNING_SECRET` | from Slack app Basic Information |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |

Add social credentials as you set up each platform (see below).

---

### 4 — Social media credentials

#### Instagram (Meta)
1. **https://developers.facebook.com/apps** → Create App → Business type
2. Add **Instagram Graph API** product
3. Generate a **long-lived access token** (system user token recommended for bots)
4. Find your **Instagram Business Account ID** in Graph API Explorer
5. Set `INSTAGRAM_ACCESS_TOKEN` and `INSTAGRAM_BUSINESS_ACCOUNT_ID`

#### LinkedIn
1. **https://www.linkedin.com/developers/apps** → Create app
2. Request `w_member_social` and `r_basicprofile` permissions
3. Complete OAuth flow to get an access token
4. Get your Person URN from `/v2/me` API call
5. Set `LINKEDIN_ACCESS_TOKEN` and `LINKEDIN_PERSON_URN`

#### Twitter / X
1. **https://developer.twitter.com/en/portal** → Create Project + App
2. Under "User authentication settings" enable **Read and Write**
3. Generate **Access Token and Secret** for your account
4. Set `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_TOKEN_SECRET`

#### YouTube
1. **https://console.cloud.google.com** → New project → Enable **YouTube Data API v3**
2. Create **OAuth 2.0 Client ID** (Web application type)
3. Run the OAuth consent flow once to get a refresh token:
   ```bash
   # Quick way: use Google OAuth Playground (https://developers.google.com/oauthplayground)
   # Scope: https://www.googleapis.com/auth/youtube.upload
   ```
4. Set `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`

---

### 5 — Invite JPT to a Slack channel

```
/invite @JPT
```

Then try:
```
@JPT generate image of a vibrant coral reef
```

---

## Local development

```bash
cp .env.example .env.local
# fill in your credentials
npm install
npm run dev
```

Use **ngrok** to expose localhost for Slack webhooks:
```bash
ngrok http 3000
# Update Slack Event Subscriptions URL to https://xxxx.ngrok-free.app/api/slack/events
# Update Slack Interactivity URL to  https://xxxx.ngrok-free.app/api/slack/interactions
# Set NEXT_PUBLIC_APP_URL=https://xxxx.ngrok-free.app in .env.local
```

---

## File structure

```
src/
├── app/
│   ├── page.tsx                       ← Status / docs page
│   └── api/
│       ├── slack/events/route.ts      ← Handles @JPT mentions
│       ├── slack/interactions/route.ts← Handles button clicks
│       ├── pixelbin/webhook/route.ts  ← PixelBin job callback
│       └── social/post/route.ts       ← Social media posting
└── lib/
    ├── pixelbin.ts                    ← PixelBin image/video generation
    ├── slack.ts                       ← Slack Web API helpers
    ├── slack-blocks.ts                ← Block Kit message builders
    ├── job-store.ts                   ← In-memory job state
    └── social/
        ├── instagram.ts
        ├── linkedin.ts
        ├── twitter.ts
        └── youtube.ts
```

---

## PixelBin plugins used

| Plugin | Purpose | Key params |
|--------|---------|------------|
| `nanoBananaPro_generate` | Text-to-image | `prompt`, `aspect_ratio`, `output_resolution` |
| `veo31Fast_generate` | Text-to-video | `prompt`, `aspect_ratio`, `resolution`, `duration`, `audio` |

---

## Notes

- **Job state** is stored in-memory. On Vercel (serverless), each lambda invocation is stateless so concurrent jobs from different channels work fine, but state is lost on cold starts. For production, swap `src/lib/job-store.ts` with Vercel KV or Upstash Redis.
- **Video generation** (Veo 3) can take 1-5 minutes. The bot uses PixelBin's webhook system so Slack is updated automatically when the job finishes.
- **YouTube** only supports video uploads (not images) via the Data API.
