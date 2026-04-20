# simalytics-api

Backend for [Simalytics](https://github.com/Kyter-com/simalytics-ios), running on Cloudflare Workers.

## Routes

- `POST /oauth` — Exchanges a Simkl authorization code for an access token. Passes Simkl's response through unchanged (status, body, content-type).
- `POST /tmdb-proxy` — Fetches TMDB watch providers for a movie or TV show. Requires:
  - `Authorization: Bearer <simkl access token>` — validated against Simkl before the TMDB call
  - `x-type: movie | tv`
  - `x-id: <tmdb id>` (numeric)

## Stack

Hono + Wrangler. No database, no build step beyond TypeScript.

## Develop

```
npm install
npm run dev
```

Create `.dev.vars` with the three secrets listed below for local testing.

## Deploy

```
npm run deploy
```

## Secrets

Managed via `wrangler secret put`:

- `SIMKL_CLIENT_SECRET`
- `TMDB_ACCESS_TOKEN`
- `TMDB_API_KEY`

## License

MIT. See [LICENSE](LICENSE).
