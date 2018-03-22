const R = require('ramda');
const checkLocale = async (ctx, next) => {
  await next();
  const locale = R.path(['state', 'request', 'query', 'locale'], ctx);
  const data = R.path(['state', 'body', 'data'], ctx);
  const doesNotHaveLocale = R.none(R.path(['name_locales', locale]));
  let error = false;
  if (data.id === 'ROOT') {
    error = doesNotHaveLocale(data.children);
  } else {
    error = doesNotHaveLocale(R.of(data));
  }
  if (error) {
    ctx.throw(404, {
      error: {
        error: `The requested category is not available in locale ${locale}`
      }
    });
  }
};

module.exports = checkLocale;
