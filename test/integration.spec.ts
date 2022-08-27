import { convertHeadersToTuples, Tracker } from '../src/tracker';
import { createTrackerMiddleware } from '../src/middleware';
import polka, {Polka} from 'polka';
import { TrackerServer } from '../src/server';
import { IncomingMessage } from 'http';
import { agent as request } from 'supertest';

function generateMockRequest(): IncomingMessage {
  const mockSocket = {
    remoteAddress: '127.0.0.1',
  };
  const request = new IncomingMessage(mockSocket);

  request.url = 'https://example.com/foobar?name=grumpy';
  request.method = 'GET';
  request.headers = {
    'user-agent': 'Mochi mochi dayo!',
  };
  return request;
}

describe('integreration', () => {
  describe('middleware', () => {

    let testPolka: Polka;
    let tracker: Tracker;

    beforeEach(() => {
      const apiKey = '01234567789ABCDEF';
      tracker = new Tracker();
      const trackerMiddleware = createTrackerMiddleware(tracker);
      const trackerServer = new TrackerServer(tracker, apiKey);

      testPolka = polka()
          .use(trackerMiddleware)
          .get('/tracker', trackerServer.serve.bind(trackerServer))
          .get('/', async (req, res) => {
            res.end('Hello world');
          });

    });

    afterEach(() => {
      if(testPolka) {
        if(testPolka.server) {
          testPolka.server.close()
        }
      }
    });

    it('should return active request', async () => {
      // Spoof an active request
      const mockRequest = generateMockRequest();
      tracker.startTask(mockRequest);

      // Get active requests from the tracker
      const response = await request(testPolka.handler)
        .get('/tracker')
        .set('Accept', 'application/json');

      await expect(response.headers["Content-Type"]).toMatch(/json/);
      await expect(response.status).toEqual(200);

    });

  });
});
