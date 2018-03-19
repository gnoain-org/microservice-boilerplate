const adapter = require('./adaptions/categories');

const input = require('./input_categories');

console.log(
  adapter.adaptCategories({ body: input.children, query: { locale: 'fr_FR' } })
);
