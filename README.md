# CrossFit Timer

A workout timer for a CrossFit box. Coaches set up workouts on a computer; the timer runs full screen on a phone mounted near the rig.

- **Modes:** For Time (with time cap), AMRAP, EMOM. Each is configurable, plus a get-ready countdown.
- **Desktop → phone:** a coach saves a workout and gets a short link and a QR code. The phone opens it, taps START, and is done. No login on the phone.
- **Phone start page:** pick a saved workout from the list, scan a QR code, or enter a code. The timer has a **← Workouts** button to go back.
- **Phone timer:** huge clock readable from a few metres, colour per phase, sound cues, screen kept awake, pause/resume.
- **Offline:** once a phone has opened the timer, it works with no signal (service worker caches the app; opened workouts are remembered on the phone).
- **Access:** only `@yaqbot.com` Google accounts can configure and save workouts.

## Look and feel

"Scoreboard" style: Barlow / Barlow Condensed type, a near-black, lime and red palette on the phone (dark while working, lime for get-ready, red for the last 10 seconds, paper when done), and a light paper layout with a dark sidebar for coaches. Icons are [Tabler Icons](https://tabler.io/icons) (MIT) via `@tabler/icons-react`; there are no emojis.

## Stack

Next.js (App Router) · TypeScript · Tailwind · Auth.js (Google) · Neon Postgres + Drizzle · Vitest · deployed on Vercel.

## How it works

- `src/lib/timer/` — the timer engine: pure functions that turn a workout config into segments, derive state from elapsed time (so a throttled tab can never drift) and schedule sound cues. Unit-tested.
- Cues are handed to the Web Audio clock ahead of time, so they stay accurate even if JavaScript timers are throttled.
- `public/sw.js` — service worker: network-first for the `/t` shell with cached fallback, cache-first for hashed assets.
- `src/auth.ts` — Google sign-in; the `signIn` callback only lets through Google-verified `@yaqbot.com` emails. Coach pages and write APIs also check the session themselves; `src/proxy.ts` adds a redirect in front.
- Workout codes are 4 characters without look-alikes (no `0/o`, `1/l/i`), about 920,000 combinations; a new code is drawn again on the rare collision. Longer 10-character ids from earlier versions keep working. Codes are a convenience, not a secret.
- Each coach chooses a display name on first sign-in (`/welcome`, changeable later). It is stored in the `coaches` table and shown as the creator of their workouts on the coach page and on phones. Emails are never exposed publicly.
- `GET /api/workouts/[id]` and `GET /api/workouts/public` (the phone's saved-workouts list) are public and read-only: they return the workout id, its settings and the creator's display name, nothing else. The "unguessable link" is therefore no longer a secret; workout settings are not sensitive and cannot be changed without signing in.

## Run locally

```bash
pnpm install
cp .env.example .env.local   # fill in the values, see below
pnpm db:push                 # create the table
pnpm dev
```

```bash
pnpm test    # timer engine, share format, auth domain rule
pnpm lint
pnpm build && pnpm start   # the service worker only registers in production builds
```

## Environment variables

| Name | What |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `AUTH_SECRET` | random secret for Auth.js sessions (`openssl rand -base64 33`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth client |
| `EXTRA_COACH_EMAILS` | optional, testing only: extra exact emails allowed to sign in |

## Deploying

1. **Vercel:** import this GitHub repo as a new project and deploy.
2. **Neon:** in the Vercel project open *Storage → Create → Neon* (free tier). This adds `DATABASE_URL` automatically.
3. **Google OAuth:** in Google Cloud Console create a project, then *APIs & Services → OAuth consent screen*: user type **External**, add the app name and your email, then **Publish app** (basic scopes need no verification). Under *Credentials → Create credentials → OAuth client ID → Web application* add the redirect URIs
   `https://<your-domain>/api/auth/callback/google` and `http://localhost:3000/api/auth/callback/google`.
4. Add `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` and `AUTH_SECRET` to the Vercel project's environment variables and redeploy.
5. Create the table once: `vercel env pull .env.local` (or copy `DATABASE_URL`), then `pnpm db:push`.

## Using it as an installed app (PWA)

The phone should run the timer as an installed app (full screen, no browser bars, opens offline). Inside the installed app the Full screen button is hidden, since the app is already full screen.

- **Android / Chrome:** the timer page shows an **Install** button. The manifest asks for full-screen display, for links to open in the installed app (`handle_links`) and for an already-open app window to be reused (`launch_handler`). Once installed, Chrome offers to open timer links in the app.
- **iPhone / iPad:** Apple has no install prompt and does not open links in an installed web app (the Camera app sends a scanned QR code to Safari), so the timer page shows the *Share → Add to Home Screen* steps. Inside the installed app the start page has a **Scan QR code** button (camera + [jsQR](https://github.com/cozmo/jsQR), no server involved) and a field for the workout **code** (or a pasted link). It also lists recently used workouts, which work offline.

## Testing sign-in without a @yaqbot.com account

`EXTRA_COACH_EMAILS` (comma-separated, exact addresses, empty by default) lets specific other Google accounts sign in, so the full flow can be tested with a personal account. Set it temporarily, test, then remove it. The domain rule itself is unit-tested.

## Known limits

- Coaches cannot create workouts offline (only the phone timer is offline-capable).
- iPhone: the ringer switch can mute Web Audio, and keep-awake needs iOS 16.4+.
- Sign-in uses an email-domain check rather than a Workspace-only `hd` restriction, so it also works for accounts that are not Google Workspace users.
