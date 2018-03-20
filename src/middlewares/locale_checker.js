const R = require('ramda');
const checkLocale = async (ctx, next) => {
  await next();
  const locale = R.path(['query', 'locale'], ctx);
  if (!R.path(['name_locales', locale], ctx.body.data)) {
    ctx.throw(404, {
      error: {
        error: `The requested category is not available in locale ${locale}`
      }
    });
  }
};

module.exports = checkLocale;
