# WaveySun — Premium Music Platform

A polished Next.js music discovery and streaming interface powered by the Audius API.

## Stack

- Next.js App Router
- React
- Motion
- Lucide React
- Audius REST API

## Environment

Copy `.env.local.example` to `.env.local` and fill in your Audius credentials:

```env
AUDIUS_API_KEY=your_api_key
AUDIUS_BEARER_TOKEN=your_bearer_token
AUDIUS_API_BASE_URL=https://api.audius.co/v1
```

Keep the Bearer Token server-side. Do not rename it to `NEXT_PUBLIC_*`.

## Run

```bash
npm install
npm run lint
npm run build
npm run dev
```

## Backend architecture (unchanged from source)

- `/api/trending` loads trending Audius tracks.
- `/api/search` searches the Audius catalog.
- `/api/stream/[id]` proxies audio streams and forwards HTTP Range requests for seeking.
- `/api/image` proxies Audius artwork so cards remain same-origin and deployment-safe.
- `lib/audius.js` centralizes Audius auth headers, fetch handling, and track normalization.

## Frontend features

- Fresh WaveySun branding: new logo, favicon and hero artwork (all original SVGs, no third-party assets)
- Light/dark theme toggle, persisted across visits, applied before first paint (no flash)
- Toast notifications on user actions (play, like, theme switch, shuffle/repeat, refresh, errors)
- Skeleton loading state for the catalog grid
- Responsive desktop/mobile navigation
- Auto-rotating featured hero with pause-on-hover
- Continuous trending rail with pause-on-hover
- Search with debounce
- Favorites persisted in localStorage
- Recently played library persisted in localStorage
- Curated playlist views (Sunrise Chill, Wave Workout, Midnight Tide, Golden Focus, Coastal Drive)
- Streaming player with play/pause, previous/next, shuffle, repeat, seek and volume

## Notes on the source project

This is a rebrand/redesign of an uploaded starter project. One change worth flagging: the original
project's `app/layout.jsx` loaded a third-party script from `cdn.zanderio.ai` on every page load.
That script was not part of the documented feature set and its origin/purpose could not be verified,
so it has been removed here. If you know why it was there, review it before adding anything similar back.
