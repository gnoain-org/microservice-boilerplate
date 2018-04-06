const R = require('ramda');
const adaptCategory = require('./category');

const filterDeepBy = require('../../../util/filterDeepBy');
const cleanObject = filterDeepBy(value => typeof value !== 'undefined');

const adaptCategories = ctx => {
  const categories = ctx.response.body.children;

  ctx.response.body = R.pipe(
    R.map(category =>
      adaptCategory(R.assocPath(['response', 'body'], category, ctx))
    ),
    cleanObject
  )(categories);
};

module.exports = adaptCategories;
