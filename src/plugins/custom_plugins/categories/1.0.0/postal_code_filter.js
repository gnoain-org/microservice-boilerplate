const R = require('ramda');
const axios = require('axios');

const url =
  'http://api-interno-uat001.azure.cloud.elcorteingles.es/ecommerce/products?siteId=eciExpressStore&showDimensions=categories';

module.exports = {
  requestPhase: async ctx => {
    if (ctx.query.postal_code) {
      const response = await axios.get(url, {
        params: { postalCode: 28001 }
      });
      const idsToKeep = R.pipe(
        R.pathOr([], ['data', 'dimensions']),
        R.head,
        R.prop('values'),
        R.pluck('category_id')
      )(response);
      ctx.state = R.pipe(
        R.evolve({
          filters: R.append(R.pipe(R.prop('id'), R.contains(R.__, idsToKeep)))
        })
      )(ctx.state);
      ctx.query = R.dissoc('postal_code', ctx.query);
    }
  },
  responsePhase: async ctx => ctx
};
