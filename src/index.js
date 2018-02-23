const Koa = require('koa');
const Router = require('koa-router');

const app = new Koa();
const router = new Router();

const axios = require('axios');
const R = require('ramda');

router.get(
  '/products/:productId',
  async (ctx, next) => {
    const ecommerceUrl = 'http://api.eci.geci/ecommerce';
    const { status, headers, data: body } = await axios.get(
      `${ecommerceUrl}/product/${ctx.params.productId}`
    );
    ctx.state = { status, headers, body };
    next();
  },
  async (ctx, next) => {
    const getPricesForId = (id, isExpress, name) => {
      const shipping_option = R.find(
        R.propEq('id', id),
        R.pathOr([], ['state', 'body', 'shipping', 'available'], ctx)
      );
      return {
        name: R.defaultTo(
          R.pipe(R.prop('title'), R.toLower)(shipping_option),
          name
        ),
        prices: R.pipe(
          R.prop('locations'),
          R.reject(R.propEq('shipping', '-')),
          R.filter(R.propEq('express_checkout', isExpress)),
          R.map(location =>
            R.merge(R.pick(['title', 'priority'], location), {
              shipping_price: R.pipe(
                R.match(/\d+(,\d{2})?/),
                R.head,
                R.replace(',', '.'),
                parseFloat
              )(location.shipping)
            })
          )
        )(shipping_option)
      };
    };

    ctx.state.body.skus = R.map(sku => {
      let shipping = [];

      R.forEachObjIndexed((value, key) => {
        R.cond([
          [
            R.equals('home_delivery'),
            () => {
              shipping = R.append(
                getPricesForId('000', false, 'standard'),
                shipping
              );
            }
          ],
          [
            R.equals('express_delivery'),
            () => {
              shipping = R.append(
                getPricesForId('000', true, 'express'),
                shipping
              );
            }
          ],
          [
            R.equals('eci_pick_up'),
            () => {
              shipping = R.append({ name: 'eci_store' }, shipping);
            }
          ],
          [
            R.equals('sts_pick_up'),
            () => {
              R.pipe(
                R.pathOr([], ['badges', 'sts_companies']),
                R.forEach(sts => {
                  shipping = R.append(getPricesForId(sts.id, false), shipping);
                })
              )(sku);
            }
          ]
        ])(key);
      })(sku.badges);
      return sku;
    }, ctx.state.body.skus);
    ctx.body = ctx.state.body;
  },
  async (ctx, next) => {
    ctx.body = ctx.state.body;
  }
);

app.use(router.routes());

if (!module.parent) {
  app.listen(4033);
}

module.exports = app;
