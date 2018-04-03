const R = require('ramda');

const filterResponse = R.curry(async (api, route, ctx, next) => {
  await next();
  const filters = ctx.state.filters;
  const combinedFilter = R.allPass(filters);
  ctx.state.body.data = R.filter(combinedFilter, ctx.state.body.data);
});

module.exports = filterResponse;
