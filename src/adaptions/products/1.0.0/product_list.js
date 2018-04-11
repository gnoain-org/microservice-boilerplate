const R = require('ramda');
const productAdapter = require('./product');
const filterDeepByRecursive = require('../../../util/filterDeepByRecursive');
const cleanObject = filterDeepByRecursive(value =>
  R.and(typeof value !== 'undefined', R.not(R.isEmpty(value)))
);

const adaptProductList = ctx => {
  const input = ctx.response.body;
  let output = R.merge(
    {},
    R.pick(['dimensions', 'selected_sort', 'pagination', 'locales'], input)
  );
  output.products = R.map(product => {
    let fakeContextualizedProduct = R.assocPath(
      ['response', 'body'],
      product,
      ctx
    );
    productAdapter(fakeContextualizedProduct);

    let adaptedProduct = R.path(
      ['response', 'body'],
      fakeContextualizedProduct
    );

    let marketplaceOffers = R.chain(sku => {
      return R.when(
        R.prop('marketplace_info'),
        R.applySpec([
          {
            offer_id: R.path(['marketplace_info', 'offer_id']),
            variant: R.prop('sku'),
            pricing: {
              sale_price: R.path(['marketplace_info', 'min_price']),
              price: R.path(['marketplace_info', 'min_origin_price']),
              discount: R.path(['marketplace_info', 'min_discount'])
            }
          },
          {
            variant: R.ifElse(
              R.path(['marketplace_info', 'sec_min_origin_price']),
              R.prop('sku'),
              R.always(undefined)
            ),
            pricing: {
              sale_price: R.path(['marketplace_info', 'sec_min_price']),
              price: R.path(['marketplace_info', 'sec_min_origin_price']),
              discount: R.path(['marketplace_info', 'sec_min_discount'])
            }
          }
        ])
      )(sku);
    }, product.skus);

    adaptedProduct.offers = R.concat(
      R.propOr([], 'offers', marketplaceOffers),
      cleanObject(marketplaceOffers)
    );

    return adaptedProduct;
  }, input.products);
  ctx.response.body = output;
};

module.exports = adaptProductList;
