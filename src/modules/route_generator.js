const R = require('ramda');
const configProvider = require('./config_provider');
const { EventEmitter } = require('events');

const middlewareComposer = routeConfig => {
  return require('../middlewares/retard_moron');
};

const routeGenerator = () => {
  const routeEmitter = new EventEmitter();
  const emitRoute = route => routeEmitter.emit('newroute', route);
  const configStream = configProvider();
  configStream.on('data', configObj => {
    R.map(
      R.pipe(
        R.applySpec({
          path: R.pipe(
            R.path(['path', 'url']),
            R.concat('/' + configObj.name + '/' + configObj.version)
          ),
          middleware: middlewareComposer
        }),
        emitRoute
      ),
      configObj.routes
    );
  });
  return routeEmitter;
};
module.exports = routeGenerator;
