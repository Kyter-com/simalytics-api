import { Hono } from "hono";
import { ofetch } from "ofetch";

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

	const res = await ofetch<unknown>("https://api.simkl.com/oauth/token", {
		method: "POST",
		retry: 2,
		retryDelay: 1000,
		body: {
			code,
			redirect_uri: "simalytics://",
			grant_type: "authorization_code",
			client_secret: c.env.SIMKL_CLIENT_SECRET,
			client_id: SIMKL_CLIENT_ID,
		},
	});

	return c.json(res as Record<string, unknown>);
});

app.post("/tmdb-proxy", async (c) => {
	const auth = c.req.header("authorization")?.split(" ")[1];
	const type = c.req.header("x-type");
	const id = c.req.header("x-id");

	if (!auth || !type || !id) {
		return c.json({ error: "No auth provided" }, 400);
	}

	const res = await fetch(
		`https://api.themoviedb.org/3/${type}/${id}/watch/providers`,
		{
			headers: {
				Authorization: `Bearer ${c.env.TMDB_ACCESS_TOKEN}`,
			},
		},
	);

	return c.json((await res.json()) as Record<string, unknown>);
});

export default app;
