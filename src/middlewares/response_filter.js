const R = require('ramda');

const filterResponse = async (ctx, next) => {
  ctx.state.filters = [];
  await next();
  const filters = ctx.state.filters;
  const combinedFilter = R.allPass(filters);
  ctx.state.body.data = R.filter(combinedFilter, ctx.state.body.data);
};

module.exports = filterResponse;
