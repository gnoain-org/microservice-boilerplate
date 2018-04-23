const R = require('ramda');
const transformCategory = require('./transformers/categoryTransformer');

const adaptCategory = ctx => {
  const locale = R.pathOr('es_ES', ['request', 'query', 'locale'], ctx);
  const config = { locale };
  const category = ctx.response.body;
  ctx.response.body = transformCategory(config, category);
  return ctx.response.body;
};

module.exports = adaptCategory;
