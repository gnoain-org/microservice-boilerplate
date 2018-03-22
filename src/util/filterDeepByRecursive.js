const R = require('ramda');
const filterDeepBy = require('./filterDeepBy');

const filterDeepByRecursive = R.curry((func, value) => {
  let filtered = value;
  let latest = value;
  do {
    filtered = latest;
    latest = filterDeepBy(func, filtered);
  } while (!R.equals(filtered, latest));
  return latest;
});

module.exports = filterDeepByRecursive;
