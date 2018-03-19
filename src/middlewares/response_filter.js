const R = require('ramda');

const filterResponse = async (ctx, next) => {
  await next();
  const filters = ctx.state.filters;
  const combinedFilter = R.allPass(filters);
  ctx.body.data = R.filter(combinedFilter, ctx.body.data);
};

module.exports = filterResponse;
