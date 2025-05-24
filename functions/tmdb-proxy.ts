import type { APIGatewayEvent } from "aws-lambda";

export const handler = async (event: APIGatewayEvent) => {
  const body = JSON.parse(event.body || "{}") as unknown as { code: string };
  const headers = event.headers;
  console.log(body);
  console.log(headers);
};
