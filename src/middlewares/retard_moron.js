const dummyResponse = async (ctx, next) => {
  await next();
  ctx.body = 'Itchy dick';
};

module.exports = dummyResponse;
