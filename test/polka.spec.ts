/**
 * Polka middleware error test code.
 *
 * TODO: Clean up and remove.
 */
import polka, { Polka } from 'polka';
import { agent as request } from 'supertest';

function brokenMiddleware(req, res, next) {
  res.end();
  throw new Error('foobar');
}

describe('integreration', () => {
  describe('middleware', () => {
    let testPolka: Polka;

    beforeEach(() => {
      testPolka = polka()
        //.use(brokenMiddleware)
        .get('/', async (req, res) => {
          res.end('Hello world');
        });
    });

    afterEach(() => {
      if (testPolka) {
        if (testPolka.server) {
          testPolka.server.close();
        }
      }
    });

    it('should return active request', async () => {
      // Get active requests from the tracker
      const response = await request(testPolka.handler)
        .get('/')
        .set('Accept', 'application/json');

      await expect(response.status).toEqual(200);
    });
  });
});
