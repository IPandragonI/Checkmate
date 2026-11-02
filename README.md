# Checkmate

Checkmate is a turn-based online chess application (Master 2 academic project): play against another player in real time, play against bots, solve puzzles, and track your Elo.

## Stack

- **Next.js 15** (App Router) — UI and API route handlers, deployable on Vercel (fully serverless)
- **Pusher Channels** — real-time layer (server publishes, clients subscribe)
- **Prisma + PostgreSQL** — persistence
- **chess.js** — rules; the server validates every move
- **Better Auth** — authentication
- **Tailwind CSS + daisyUI** — styling

## Architecture

There is no long-lived server process. All state lives in PostgreSQL and every action is a short HTTP request:

```
Browser ── POST /api/games/:id/move ──▶ Route handler ─▶ GameService (validate, clocks, DB transaction)
   ▲                                                         │
   └────────── Pusher event on private-game-:id ◀────────────┘
```

- `POST /api/games/create` creates a game (the access code is generated server-side).
- `POST /api/games/:id/join` takes the free seat; the game starts when both seats are filled.
- `POST /api/games/:id/move` — authorisation, turn, server-side clock, legality, persistence, game-over and Elo in one transaction (optimistic lock on the position).
- `POST /api/games/:id/chat`, `POST /api/games/:id/timeout` (the server verifies the clock really expired).
- `GET /api/games/:id` — full state, used by clients to resynchronise.
- `POST /api/pusher/auth` — only the two players may subscribe to `private-game-:id`.

Events published on the channel: `start`, `move`, `gameOver`, `message`. Clients dedupe by move number, resync on every (re)subscription, and poll as a fallback while waiting or if the real-time connection is down. Pusher is only a notification channel: if a message is lost, the database remains the source of truth.

Bot games run the engine in the browser, but each move is still validated and persisted by the server, and a bot move is only accepted on the bot's turn.

## Local development

```bash
npm install
cp .env.example .env          # fill in the values
docker compose up -d          # PostgreSQL + MailHog (optional)
npx prisma migrate dev
npm run seed                  # bots
npm run dev                   # http://localhost:3000
```

You need a (free) Pusher Channels app: https://dashboard.pusher.com → create an app → copy the credentials into `.env`.

## Deploying on Vercel

1. Create a **pooled** PostgreSQL database (Neon, Supabase pooler, Vercel Postgres…). Use the pooled URL as `DATABASE_URL` and the direct URL as `DIRECT_URL`.
2. Create a Pusher Channels app (choose the cluster closest to your users).
3. In the Vercel project settings, set all variables from `.env.example`. Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_BASE_URL` to your production URL.
4. Apply the migrations once from your machine (or CI) against the production database, then seed the bots:
   ```bash
   DATABASE_URL=<direct url> DIRECT_URL=<direct url> npx prisma migrate deploy
   DATABASE_URL=<direct url> npm run seed
   ```
5. Deploy. `postinstall`/`build` run `prisma generate`.

The migration `20261102120000_hardening_clock_indexes` renumbers moves per game before adding a unique `(gameId, moveNumber)` constraint, so it is safe on existing data.

## Project structure

- `src/app` — pages, components and API routes
- `src/server/services/gameServices.ts` — game engine (rules, clocks, Elo)
- `src/lib` — Prisma, auth, Pusher (server/client), email
- `prisma/` — schema, migrations, seed
- `public/` — static assets

## License

MIT
