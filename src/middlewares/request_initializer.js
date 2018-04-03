const R = require('ramda');

const initializeRequest = R.curry(async (api, route, ctx, next) => {
  ctx.api = api;
  ctx.route = route;

  const buildUpstreamURL = R.converge(R.concat, [
    R.path(['api', 'upstream', 'uat']),
    R.converge(R.pathOr, [
      R.path(['route', 'path', 'url']),
      R.always(['route', 'path', 'upstream']),
      R.identity
    ])
  ]);

  ctx.upstream = R.assoc(
    'request',
    R.merge(
      {
        url: buildUpstreamURL(ctx)
      },
      R.pick(['method', 'body', 'query', 'params', 'headers'], ctx)
    ),
    {}
  );

  ctx.state.filters = [];
  await next();

  ctx.body = ctx.state.body;
});

module.exports = initializeRequest;
