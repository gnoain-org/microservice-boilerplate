const Koa = require('koa');
const Router = require('koa-router');

const app = new Koa();
const Router = require('koa-router');
const axios = require('axios');
const { transform, checkParams, listURL } = require('./product-list');

let router = new Router();

router.get('/list', async (ctx, next) => {
  ctx.body = await checkParams(ctx.request.query)
    .then(axios.get.bind(axios, listURL))
    .then(transform.bind(null, ctx))
    .catch(error => error);

  next();
});

app.use(router.routes());

if (!module.parent) {
  app.listen(4033);
}

module.exports = app;
