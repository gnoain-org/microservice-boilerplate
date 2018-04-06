const axios = require('axios');
const R = require('ramda');

const makeRequest = R.curry(async (api, route, ctx, next) => {
  console.log('entro al requester');
  let { data: body, headers, status } = await axios({
    url: ctx.upstream.request.url,
    method: ctx.upstream.request.method
  });
  ctx.upstream.response = { body, headers, status };
  ctx.response.body = body;
  ctx.response.status = status;
  for (let headerName in headers) {
    ctx.set(headerName, headers[headerName]);
  }
  ctx.response.body = body;
  await next();
});

module.exports = makeRequest;
