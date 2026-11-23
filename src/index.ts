import { Hono } from "hono";

type Bindings = {
	SIMKL_CLIENT_SECRET: string;
	TMDB_ACCESS_TOKEN: string;
	TMDB_API_KEY: string;
};

// AUTH V1 app #49868. Builds before the AUTH V2 release still sign in with it
// through /oauth. Simkl expects to retire AUTH V1 around April 2027; remove this
// client ID and /oauth once old builds have aged out after that.
const SIMKL_V1_CLIENT_ID =
	"c387a1e6b5cf2151af039a466c49a6b77891a4134aed1bcb1630dd6b8f0939c9";

// AUTH V2 app #8275966: a public client (PKCE, no secret). The iOS app exchanges
// and refreshes its tokens on the device, so this Worker only ever verifies them.
const SIMKL_V2_CLIENT_ID =
	"c43e982d8db0674c1f5a2221f6510fc500dd71656d27b49f0c333b10ae2c9845";

const APP_NAME = "simalytics-api";
const APP_VERSION = "2.1.0";

const app = new Hono<{ Bindings: Bindings }>();

/**
 * A Simkl token only works with the client ID it was issued for. AUTH V2 access
 * tokens carry a `simkl_at_` prefix; AUTH V1 tokens are bare hex.
 */
function simklClientIDForToken(token: string): string {
	return token.startsWith("simkl_at_")
		? SIMKL_V2_CLIENT_ID
		: SIMKL_V1_CLIENT_ID;
}

type TokenCheck =
	| { ok: true }
	| { ok: false; status: 401 | 429 | 502; retryAfter?: string };

async function verifySimklToken(token: string): Promise<TokenCheck> {
	const clientID = simklClientIDForToken(token);
	const url = new URL("https://api.simkl.com/users/settings");
	url.searchParams.set("client_id", clientID);
	url.searchParams.set("app-name", APP_NAME);
	url.searchParams.set("app-version", APP_VERSION);

	const verifyRes = await fetch(url, {
		headers: {
			Authorization: `Bearer ${token}`,
			"simkl-api-key": clientID,
			"User-Agent": `${APP_NAME}/${APP_VERSION}`,
		},
	});

	if (verifyRes.ok) return { ok: true };
	// Keep Simkl's daily-limit answer distinct from a rejected token, so the app
	// doesn't treat a user's spent allowance as a sign-in problem.
	if (verifyRes.status === 429) {
		return {
			ok: false,
			status: 429,
			retryAfter: verifyRes.headers.get("Retry-After") ?? undefined,
		};
	}
	if (verifyRes.status === 401 || verifyRes.status === 403) {
		return { ok: false, status: 401 };
	}
	return { ok: false, status: 502 };
}

function tokenRejection(check: Exclude<TokenCheck, { ok: true }>): Response {
	const error =
		check.status === 401
			? "Invalid Simkl token"
			: check.status === 429
				? "Simkl daily request limit reached"
				: "Couldn't verify the Simkl token";
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (check.retryAfter) headers["Retry-After"] = check.retryAfter;
	return new Response(JSON.stringify({ error }), {
		status: check.status,
		headers,
	});
}

function tmdbResponse(response: Response): Response {
	return new Response(response.body, {
		status: response.status,
		headers: {
			"Content-Type":
				response.headers.get("Content-Type") ?? "application/json",
		},
	});
}

// AUTH V1 code exchange for builds that predate AUTH V2. Current builds exchange
// AUTH V2 codes on the device with PKCE and never call this route.
app.post("/oauth", async (c) => {
	const { code } = await c.req.json<{ code: string }>();

	const simklRes = await fetch("https://api.simkl.com/oauth/token", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			code,
			redirect_uri: "simalytics://",
			grant_type: "authorization_code",
			client_secret: c.env.SIMKL_CLIENT_SECRET,
			client_id: SIMKL_V1_CLIENT_ID,
		}),
	});

	return new Response(simklRes.body, {
		status: simklRes.status,
		headers: {
			"Content-Type":
				simklRes.headers.get("Content-Type") ?? "application/json",
		},
	});
});

app.post("/tmdb-proxy", async (c) => {
	const token = c.req.header("authorization")?.split(" ")[1];
	const type = c.req.header("x-type");
	const id = c.req.header("x-id");

	if (!token) return c.json({ error: "Missing Authorization header" }, 401);
	if (type !== "movie" && type !== "tv")
		return c.json({ error: "Invalid x-type (expected 'movie' or 'tv')" }, 400);
	if (!id || !/^\d+$/.test(id))
		return c.json({ error: "Invalid x-id (expected numeric)" }, 400);

	const check = await verifySimklToken(token);
	if (!check.ok) return tokenRejection(check);

	const tmdbRes = await fetch(
		`https://api.themoviedb.org/3/${type}/${id}/watch/providers`,
		{
			headers: { Authorization: `Bearer ${c.env.TMDB_ACCESS_TOKEN}` },
		},
	);

	return tmdbResponse(tmdbRes);
});

app.post("/tmdb-credits", async (c) => {
	const token = c.req.header("authorization")?.split(" ")[1];
	const type = c.req.header("x-type");
	const id = c.req.header("x-id");

	if (!token) return c.json({ error: "Missing Authorization header" }, 401);
	if (type !== "movie" && type !== "tv")
		return c.json({ error: "Invalid x-type (expected 'movie' or 'tv')" }, 400);
	if (!id || !/^\d+$/.test(id))
		return c.json({ error: "Invalid x-id (expected numeric)" }, 400);

	const check = await verifySimklToken(token);
	if (!check.ok) return tokenRejection(check);

	const tmdbRes = await fetch(
		`https://api.themoviedb.org/3/${type}/${id}/credits`,
		{
			headers: { Authorization: `Bearer ${c.env.TMDB_ACCESS_TOKEN}` },
		},
	);

	return tmdbResponse(tmdbRes);
});

app.post("/tmdb-person", async (c) => {
	const token = c.req.header("authorization")?.split(" ")[1];
	const id = c.req.header("x-id");

	if (!token) return c.json({ error: "Missing Authorization header" }, 401);
	if (!id || !/^\d+$/.test(id))
		return c.json({ error: "Invalid x-id (expected numeric)" }, 400);

	const check = await verifySimklToken(token);
	if (!check.ok) return tokenRejection(check);

	const tmdbRes = await fetch(
		`https://api.themoviedb.org/3/person/${id}?append_to_response=combined_credits`,
		{
			headers: { Authorization: `Bearer ${c.env.TMDB_ACCESS_TOKEN}` },
		},
	);

	return tmdbResponse(tmdbRes);
});

export default app;
