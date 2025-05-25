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
    const api = new sst.aws.ApiGatewayV2("simalytics-api");

    const SimklClientSecret = new sst.Secret("SimklClientSecret");
    const TmdbApiKey = new sst.Secret("TmdbApiKey");
    const TmdbAccessToken = new sst.Secret("TmdbAccessToken");

    api.route("POST /oauth", {
      handler: "functions/oauth.handler",
      runtime: "nodejs20.x",
      name: `${$app.name}-${$app.stage}-oauth`,
      link: [SimklClientSecret],
      logging: {
        retention: "1 year",
      },
    });

    api.route("POST /tmdb-proxy", {
      handler: "functions/tmdb-proxy.handler",
      runtime: "nodejs20.x",
      name: `${$app.name}-${$app.stage}-tmdb-proxy`,
      link: [TmdbApiKey, TmdbAccessToken],
      logging: {
        retention: "1 year",
      },
    });
  },
});
