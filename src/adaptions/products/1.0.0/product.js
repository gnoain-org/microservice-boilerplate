const transformProduct = require('./trasformers/product.transformer');

const adaptProduct = ctx => {
  ctx.response.body = transformProduct(ctx.response.body);
};

module.exports = adaptProduct;
