const productTransformer = require('../../../../adaptions/products/1.0.0/trasformers/product.transformer');

test('Product transformer - ECI puro - v1.0.0 - Product ID: A24532859', () => {
  const input = require('../inputs/product.ecipuro.input');
  const output = require('./outputs/product.ecipuro.output');
  expect(productTransformer(input)).toEqual(output);
});

test('Product transformer - Puro MKP – EE Ajena - v1.0.0 - Product ID: MP_0008552_9788491480525', () => {
  const input = require('../inputs/product.puromkp.ajena.input');
  const output = require('./outputs/product.puromkp.ajena.output');
  expect(productTransformer(input)).toEqual(output);
});
