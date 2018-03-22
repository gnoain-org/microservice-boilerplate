const axios = require('axios');
const R = require('ramda');

const makeRequest = async (ctx, next) => {
  const result = await axios({
    url: ctx.state.url,
    method: ctx.state.method
  });
  ctx.state.body = {
    data: result.data
  };
  return next();
};

module.exports = makeRequest;
