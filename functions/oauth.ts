import { Resource } from "sst";
import { ofetch } from "ofetch";
import type { APIGatewayEvent } from "aws-lambda";

export const handler = async (event: APIGatewayEvent) => {
  const body = JSON.parse(event.body || "{}") as unknown as { code: string };
  if (!body?.code) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "No code provided" }),
    };
  }

  const res = await ofetch("https://api.simkl.com/oauth/token", {
    method: "POST",
    retry: 2,
    retryDelay: 1000,
    body: {
      code: body.code,
      client_id:
        "c387a1e6b5cf2151af039a466c49a6b77891a4134aed1bcb1630dd6b8f0939c9",
      redirect_uri: "simalytics://",
      grant_type: "authorization_code",
      client_secret: Resource.SimklClientSecret.value,
    },
  });

  console.log(res);

  return { hello: "world" };
};
