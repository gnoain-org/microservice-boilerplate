const Koa = require('koa');
const app = new Koa();

app.use(async ctx => {
  ctx.body = 'Hello World!!';
});

if (!module.parent) {
  app.listen(4033);
}

module.exports = app;
