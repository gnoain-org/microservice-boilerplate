const R = require('ramda');
const Koa = require('koa');
const Router = require('koa-router');

const app = new Koa();
const router = new Router();

const HTTP_VERBS_MAP = {
  GET: router.get.bind(router),
  PUT: router.put.bind(router),
  POST: router.post.bind(router),
  DELETE: router.del.bind(router),
  HEAD: router.head.bind(router),
  OPTIONS: router.options.bind(router),
  PATCH: router.patch.bind(router)
};

// const axios = require('axios');
// const { transform, checkParams, listURL } = require('./product-list');
// router.get('/list', async (ctx, next) => {
//   ctx.body = await checkParams(ctx.request.query)
//     .then(axios.get.bind(axios, listURL))
//     .then(transform.bind(null, ctx))
//     .catch(error => error);

//   next();
// });
const routeEmitter = require('./modules/route_generator')();

/*
  Route: {
    path,
    method, -> HTTP verb
    middleware -> koa's middlewares composed stack
  }
*/
routeEmitter.on('newroute', route => {
  let matcher = HTTP_VERBS_MAP[route.method];
  if (matcher) {
    router.stack = R.reject(
      R.useWith(R.equals, [R.prop('path'), R.prop('path')])(route),
      router.stack
    );
    matcher(route.path, route.middleware);
  }
});

app.use(router.routes());
app.listen(4033);

module.exports = app;
