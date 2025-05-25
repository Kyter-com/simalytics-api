import { Resource } from "sst";
import type { APIGatewayEvent } from "aws-lambda";

export const handler = async (event: APIGatewayEvent) => {
  const headers = event.headers;
  const auth = headers?.authorization?.split(" ")?.[1];
  const type = headers?.["x-type"];
  const id = headers?.["x-id"];
  if (!auth || !type || !id)
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "No auth provided" }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  console.log("Auth Token:", auth);
  console.log("Type:", type);
  console.log("ID:", id);

  const res = await fetch(
    `https://api.themoviedb.org/3/${type}/${id}/watch/providers`,
    {
      headers: {
        Authorization: `Bearer ${
          (Resource as unknown as { TmdbAccessToken: { value: string } })
            .TmdbAccessToken.value
        }`,
      },
    }
  )
    .then(async (res) => await res.json())
    .catch((error) => {
      console.log(error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "error" }),
        headers: {
          "Content-Type": "application/json",
        },
      };
    });

  return {
    statusCode: 200,
    body: JSON.stringify(res),
    headers: {
      "Content-Type": "application/json",
    },
  };
};
