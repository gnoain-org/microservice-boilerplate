const axios = require('axios');
const R = require('ramda');

const makeRequest = async (ctx, next) => {
  const result = await axios({
    url: ctx.state.url,
    method: ctx.state.method
  });
  ctx.body = {
    data: result.data.children
  };
  return next();
};

module.exports = makeRequest;
