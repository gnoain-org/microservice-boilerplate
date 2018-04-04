const axios = require('axios');
const R = require('ramda');

const makeRequest = R.curry(async (api, route, ctx, next) => {
  let { data: body, headers, status } = await axios({
    url: ctx.upstream.request.url,
    method: ctx.upstream.request.method
  });
  ctx.upstream.response = { body, headers, status };
  ctx.response = R.merge(ctx.response, R.clone(ctx.upstream.response));
  await next();
});

module.exports = makeRequest;
