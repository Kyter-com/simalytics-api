# simalytics-api

Backend for [Simalytics](https://github.com/Kyter-com/simalytics-ios), running on Cloudflare Workers.

## Routes

- `POST /oauth` — Exchanges a Simkl **AUTH V1** authorization code for an access token, for app builds that predate AUTH V2. Passes Simkl's response through unchanged (status, body, content-type). Remove it (and `SIMKL_CLIENT_SECRET`) once Simkl retires AUTH V1 (expected around April 2027) and old builds have aged out. Current builds use AUTH V2: a public client that exchanges and refreshes tokens on the device with PKCE, so they never call this route.
- `POST /tmdb-proxy` — Fetches TMDB watch providers for a movie or TV show. Requires:
  - `Authorization: Bearer <simkl access token>` — validated against Simkl before the TMDB call. AUTH V1 tokens and AUTH V2 tokens (`simkl_at_…`) are both accepted; each is checked with its own client ID, since a Simkl token only works with the app it was issued to. A spent daily Simkl allowance returns `429` (with `Retry-After`) rather than `401`.
  - `x-type: movie | tv`
  - `x-id: <tmdb id>` (numeric)
- `POST /tmdb-credits` — Fetches TMDB cast and crew credits for a movie or TV show. Requires the same headers as `/tmdb-proxy`.
- `POST /tmdb-person` — Fetches TMDB person details with combined movie and TV credits. Requires:
  - `Authorization: Bearer <simkl access token>` — validated against Simkl before the TMDB call
  - `x-id: <tmdb person id>` (numeric)

## Stack

Hono + Wrangler. No database, no build step beyond TypeScript.

## Data handling

- The Worker has no application database and does not intentionally persist Simkl authorization codes or access tokens.
- `POST /oauth` forwards the authorization code to Simkl and streams Simkl's response back to the app.
- TMDB proxy routes validate the supplied access token against Simkl for the duration of the request, then fetch the requested TMDB data.
- Cloudflare Workers observability is enabled for operational monitoring. Cloudflare may process request metadata and logs according to the account's configured observability and retention settings.
- Do not add request-body or authorization-header logging. Any future persistence, analytics, or new third-party data flow must be reflected in the Simalytics privacy policy and App Store privacy declaration.

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
