const R = require('ramda');

const middlewares = require('../middlewares');

const generateMiddlewaresForApiRoute = (api, route) => {
  return R.map(R.map(R.partial(R.__, [api, route])), middlewares);
};

module.exports = generateMiddlewaresForApiRoute;
