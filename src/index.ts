import { Hono } from "hono";

type Bindings = {
	SIMKL_CLIENT_SECRET: string;
	TMDB_ACCESS_TOKEN: string;
	TMDB_API_KEY: string;
};

const SIMKL_CLIENT_ID =
	"c387a1e6b5cf2151af039a466c49a6b77891a4134aed1bcb1630dd6b8f0939c9";

const app = new Hono<{ Bindings: Bindings }>();

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
			client_id: SIMKL_CLIENT_ID,
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

	const verifyRes = await fetch("https://api.simkl.com/users/settings", {
		headers: {
			Authorization: `Bearer ${token}`,
			"simkl-api-key": SIMKL_CLIENT_ID,
		},
	});
	if (!verifyRes.ok) return c.json({ error: "Invalid Simkl token" }, 401);

	const tmdbRes = await fetch(
		`https://api.themoviedb.org/3/${type}/${id}/watch/providers`,
		{
			headers: { Authorization: `Bearer ${c.env.TMDB_ACCESS_TOKEN}` },
		},
	);

	return new Response(tmdbRes.body, {
		status: tmdbRes.status,
		headers: {
			"Content-Type": tmdbRes.headers.get("Content-Type") ?? "application/json",
		},
	});
});

export default app;
