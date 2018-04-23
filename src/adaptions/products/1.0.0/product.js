const transformProduct = require('./trasformers/product.transformer');
const R = require('ramda');

const filterDeepByRecursive = require('../../../util/filterDeepByRecursive');
const cleanObject = filterDeepByRecursive(
  value => typeof value !== 'undefined' && !R.isEmpty(value)
);

const adaptProduct = ctx => {
  ctx.response.body = cleanObject(transformProduct(ctx.response.body));
};

module.exports = adaptProduct;
