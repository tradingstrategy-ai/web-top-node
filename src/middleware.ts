/**
 * HTTP tracking middleware for Node.js web servers.
 */
import type { RequestHandler } from 'express';
import { Tracker } from './tracker';

/**
 * Create a tracking middleware which you can use() with Express.js-like server.
 *
 * Supported web servers
 *
 * - Express.js
 * - Polka
 *
 * For reference implementation on logging, see
 * https://www.moesif.com/blog/technical/logging/How-we-built-a-Nodejs-Middleware-to-Log-HTTP-API-Requests-and-Responses/
 *
 * @param tracker Tracker backend for this web server
 *
 * @param tags Extra tags requests are tagged with
 */
export function createTrackerMiddleware(tracker: Tracker, tags?: Tags) {
  const middleware: RequestHandler = (request, response, next) => {
    try {
      tracker.startTask(request, tags);
    } catch (e) {
      console.error('Tracker middleware bug', e);
      response.writeHead(500, 'Tracker middleware failure');
      //response.send("Tracler middleware failure. See logs for mode details.");
      response.end();
      return;
    }

    function onClose() {
      tracker.endTask(request, response);
    }

    request.on('close', onClose);
    request.on('finish', () => {
      request.off('close', onClose);
    });

    next();
  };

  return middleware;
}
