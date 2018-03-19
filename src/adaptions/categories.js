const R = require('ramda');
const adaptCategory = require('./category');

const filterDeepBy = require('utils/filter-deep-by');
const cleanObject = filterDeepBy(value => typeof value !== 'undefined');

const adaptCategories = ctx => {
  const locale = ctx.query.locale;
  const categories = ctx.body;

  return R.pipe(
    R.map(category =>
      adaptCategory({ body: category, query: { locale: locale } })
    ),
    cleanObject
  )(categories);
};

module.exports = adaptCategories;
