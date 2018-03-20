const R = require('ramda');
const adaptCategory = require('./category');

const filterDeepBy = require('../util/filterDeepBy');
const cleanObject = filterDeepBy(value => typeof value !== 'undefined');

const adaptCategories = ctx => {
  const categories = ctx.body.data.children;

  return R.pipe(
    R.map(category => adaptCategory(R.assoc('body', { data: category }, ctx))),
    cleanObject
  )(categories);
};

module.exports = adaptCategories;
