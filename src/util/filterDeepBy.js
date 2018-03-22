const R = require('ramda');

const filterDeepBy = R.curry((func, value) => {
  const isObjectLike = typeof value == 'object' && value !== null;
  // const isObjectLike = R.and(R.is(Object), R.complement(R.equals)(null))(value);
  if (isObjectLike) {
    return R.pipe(R.filter(func), R.map(filterDeepBy(func)))(value);
  } else {
    return value;
  }
});

module.exports = filterDeepBy;
