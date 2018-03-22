const R = require('ramda');

const initializeRequest = async (ctx, next) => {
  ctx.state = R.merge(ctx.state, {
    request: {
      method: ctx.method,
      body: ctx.body,
      query: ctx.query,
      params: ctx.params
    }
  });
  ctx.state.filters = [];
  await next();

  ctx.body = ctx.state.body;
};

module.exports = initializeRequest;
