const R = require('ramda');
const axios = require('axios');

const url =
  'http://api-interno-uat001.azure.cloud.elcorteingles.es/ecommerce/products?siteId=eciExpressStore&showDimensions=categories';

const applyExpandAndInclude = async (ctx, next) => {
  if (true) {
    //if (ctx.query.postal_code) {
    try {
      const response = await axios.get(url, {
        params: { postalCode: 28001 }
      });
    } catch (blah) {
      console.log(blah);
    }
    console.log(response);
  }
};

applyExpandAndInclude();

module.exports = applyExpandAndInclude;
