const R = require('ramda');

const handleError = R.curry(async (api, route, ctx, next) => {
  try {
    //let cachedresponse = R.clone(ctx);
    await next();
    //console.log.bind(console)(ctx.response);
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = err.error;
    ctx.app.emit('error', err, ctx);
  }
});
module.exports = handleError;
