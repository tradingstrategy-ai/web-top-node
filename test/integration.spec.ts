import { convertHeadersToTuples, Tracker } from '../src/tracker';
import { createTrackerMiddleware } from '../src/middleware';
import polka, { Polka } from 'polka';
import {TrackerServer, WebTopServerActions} from '../src/server';
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
    const apiKey = '01234567789ABCDEF';

    beforeEach(() => {
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
      if (testPolka) {
        if (testPolka.server) {
          testPolka.server.close();
        }
      }
    });

    it('should return active request', async () => {
      // Spoof an active request
      const mockRequest = generateMockRequest();
      tracker.startTask(mockRequest);

      // Get active requests from the tracker
      const response = await request(testPolka.handler)
        .get(`/tracker`)
        .query({ 'api-key': apiKey, "action": WebTopServerActions.active_tasks })
        .set('Accept', 'application/json');

      if (response.statusCode != 200) {
        throw new Error(`API returned: ${response.status}: ${response.text}`);
      }

      expect(response.headers['content-type']).toMatch(/json/);

      const data = JSON.parse(response.text);
      // The mock request and /tracker request
      expect(Object.keys(data).length).toEqual(2);
      const activeRequest = data[1];
      expect(activeRequest.task_id).toEqual(1);
      expect(activeRequest.protocol).toEqual("https");
      expect(activeRequest.host).toEqual("example.com");

      const apiRequest = data[2];
      expect(apiRequest.path).toEqual("/tracker");
      expect(apiRequest.method).toEqual("GET");
      expect(apiRequest.process_id).toBeGreaterThan(1);

    });

    it('tracker endpoint gives 405 if no API key is given', async () => {
      // Spoof an active request
      const mockRequest = generateMockRequest();
      tracker.startTask(mockRequest);

      // Get active requests from the tracker
      const response = await request(testPolka.handler)
        .get('/tracker')
        .set('Accept', 'application/json');

      expect(response.status).toEqual(403);
    });
  });
});
