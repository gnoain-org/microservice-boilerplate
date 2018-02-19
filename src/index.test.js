const request = require('supertest');
const app = require('./index');

describe('Server Index', () => {
  test('It should say hello', async () => {
    const response = await request(app.callback()).get('/');
    expect(response.text).toMatchSnapshot();
  });
});
