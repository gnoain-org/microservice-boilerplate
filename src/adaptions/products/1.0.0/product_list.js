const R = require('ramda');
const productAdapter = require('./product');
const filterDeepByRecursive = require('../../../util/filterDeepByRecursive');
const cleanObject = filterDeepByRecursive(value =>
  R.and(typeof value !== 'undefined', R.not(R.isEmpty(value)))
);

const adaptProductList = ctx => {
  const input = ctx.response.body;
  let output = {};

  output.search = R.pick(
    ['did_you_mean', 'spell_correction', 'url_to_redirect'],
    input
  );

  const [categories, dimensions] = R.partition(
    R.pipe(R.prop('id'), R.equals('100972'))
  )(R.prop('dimensions', input));

  output.pagination = R.prop('pagination', input);
  output.sort = R.prop('selected_sort', input);

  output.data_context = R.applySpec({
    categories: R.always(categories),
    dimensions: R.always(dimensions),
    allAvailable: R.prop('available_add_to_cart_all'),
    eciExpressCentreID: R.prop('eci_express_centre_id'),
    xmasBasketBudget: R.prop('basket_budget'),
    otherCategoriesResults: R.prop('results_other_categories')
  })(input);

  output.data = R.map(product => {
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

    const marketplaceOffers = R.chain(
      R.ifElse(
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
        ]),
        R.always(undefined)
      ),
      product.skus
    );

    const marketplaceProviders = R.chain(
      R.ifElse(
        R.prop('marketplace_info'),
        R.applySpec({
          name: R.path(['marketplace_info', 'min_offer_provider'])
        }),
        R.always(undefined)
      ),
      product.skus
    );

    adaptedProduct.offers = R.filter(
      R.path(['pricing', 'price']),
      R.concat(
        R.propOr([], 'offers', adaptedProduct),
        cleanObject(marketplaceOffers)
      )
    );
    adaptedProduct.providers = R.concat(
      R.propOr([], 'providers', adaptedProduct),
      cleanObject(marketplaceProviders)
    );

    return adaptedProduct;
  }, input.products);
  ctx.response.body = output;
};

module.exports = adaptProductList;
