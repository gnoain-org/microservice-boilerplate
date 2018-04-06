const R = require('ramda');

module.exports = {
  requestPhase: async ctx => ctx,
  responsePhase: async ctx => {
    const locale = R.path(['request', 'query', 'locale'], ctx);
    const data = R.path(['response', 'body'], ctx);
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
  }
};
