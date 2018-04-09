const R = require('ramda');

const initializeRequest = R.curry(async (api, route, ctx, next) => {
  ctx.api = api;
  ctx.route = route;

  const buildUpstreamURL = ctx => {
    let completeURL = R.converge(R.concat, [
      R.path(['api', 'upstream', 'uat']),
      R.converge(R.pathOr, [
        R.path(['route', 'path', 'url']),
        R.always(['route', 'path', 'upstream']),
        R.identity
      ])
    ])(ctx);
    R.forEachObjIndexed((paramValue, paramName) => {
      completeURL = completeURL.replace(`:${paramName}`, paramValue);
    }, ctx.params);
    return completeURL;
  };

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
});

module.exports = initializeRequest;
