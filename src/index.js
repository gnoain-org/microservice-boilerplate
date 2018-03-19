const Koa = require('koa');
const Router = require('koa-router');

const app = new Koa();
const axios = require('axios');
const { transform, checkParams, listURL } = require('./product-list');

let router = new Router();

// router.get('/list', async (ctx, next) => {
//   ctx.body = await checkParams(ctx.request.query)
//     .then(axios.get.bind(axios, listURL))
//     .then(transform.bind(null, ctx))
//     .catch(error => error);

//   next();
// });

router.get('/categories', async (ctx, next) => {
  ctx.state.url = 'http://api.eci.geci/ecommerce/categories';
  ctx.state.method = 'GET';
  ctx.state.filters = [];
  ctx.state.route = { adaption_path: __dirname + '/adaptions/categories' };
  ctx.state.route.parameters = [
    {
      name: 'include',
      values: ['locales', 'children', 'children.locales']
    },
    {
      name: 'expand',
      values: ['locales', 'children', 'children.locales']
    }
  ];
  await next();
});

app.use(router.routes());
app.use(require('./middlewares/postal_code_filter'));
app.use(require('./middlewares/expand_include'));
app.use(require('./middlewares/response_filter'));
app.use(require('./middlewares/response_adapter'));
app.use(require('./middlewares/requester'));

app.listen(4033);

module.exports = app;
