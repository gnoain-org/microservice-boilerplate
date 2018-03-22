const R = require('ramda');

const adaptResponse = async (ctx, next) => {
  await next();
  const adaption = require(ctx.state.route.adaption_path);
  ctx.state.body.data = adaption(ctx);
};

module.exports = adaptResponse;
