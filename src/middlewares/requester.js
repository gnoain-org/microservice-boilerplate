const axios = require('axios');
const R = require('ramda');

const makeRequest = R.curry(async (api, route, ctx, next) => {
  const result = await axios({
    url: ctx.upstream.request.url,
    method: ctx.upstream.request.method
  });
  ctx.state.body = {
    data: result.data
  };
  await next();
});

module.exports = makeRequest;
