const R = require('ramda');
const Joi = require('joi');

const listURL = 'http://api.eci.geci/ecommerce/products';

const categoriesID = '100972';
const collapsedProperties = ['dimensions', 'categories'];
const schema = Joi.object().keys({
  size: Joi.number()
    .min(1)
    .max(36),
  offset: Joi.number(),
  dimensions: Joi.any(),
  categoryID: Joi.number(),
  expand: Joi.any()
});

async function transform(ctx, response) {
  let source = response.data;
  let fieldsToExpand = (ctx.query.expand && ctx.query.expand.split(',')) || [];
  let mask = R.filter(
    property => !R.contains(property, fieldsToExpand),
    collapsedProperties
  );

  source.dimensions = R.reject(
    dimension =>
      dimension.id === categoriesID && (source.categories = dimension.values),
    source.dimensions
  );

  source = R.omit(mask, source);
  return source;
}

async function checkParams(params) {
  return { params: await Joi.validate(params, schema) };
}

module.exports = { transform, checkParams, listURL };
