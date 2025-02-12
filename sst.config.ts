/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "simalytics-api",
      removal: input?.stage === "prod" ? "retain" : "remove",
      protect: ["prod"].includes(input?.stage),
      home: "aws",
      providers: {
        aws: {
          region: "us-east-2",
        },
      },
    };
  },

  async run() {
    const api = new sst.aws.ApiGatewayV2("simalytics-api", {
      domain: {
        cert: "arn:aws:acm:us-east-2:974468860722:certificate/ee315262-c2a4-4bc0-97fc-5d000c9dcaf0",
        name: "api.simalytics.kyter.com",
        dns: false,
      },
    });

    const SimklClientSecret = new sst.Secret("SimklClientSecret");

    api.route("POST /oauth", {
      handler: "functions/oauth.handler",
      runtime: "nodejs20.x",
      name: `${$app.name}-${$app.stage}-oauth`,
      link: [SimklClientSecret],
      logging: {
        retention: "1 year",
      },
    });
    // TODO: Biome
  },
});
// TODO: GitHub Actions
// TODO: Dependabot
