/**
 * A server interface for web-top client to get the active tasks from this Node.js process.
 */

import { Tracker } from './tracker';
import { IncomingMessage, OutgoingHttpHeaders } from 'http';
import http from 'http';

/**
 *
 */
enum WebTopServerActions {
  active_tasks = 'active_tasks',
  completed_tasks = 'completed_tasks',
}

/**
 * API key is not set.
 */
class APIKeyMustGivenError extends Error {}

/**
 * A web-top server.
 *
 * - Creates an API end point for web-top client application
 *
 * - This endpoint accepts only HTTP GETs
 *
 * - Each GET needs to have `api-key` parameter set
 *
 * - Each GET needs
 */
class Server {
  /**
   * Access control of who can see the active and complete requests.
   *
   * The data contains sensitive information like HTTP request parameters
   * and IP addresses. Never expose your API key.
   */

  apiKey: string;

  tracker: Tracker;

  /**
   * Create a new server function that will
   *
   * @param tracker
   *
   * @param manualApiKey
   *  Manually set API key.
   *  If not set read TOP_WEB_API_KEY environment variable.
   */
  constructor(tracker: Tracker, manualApiKey?: string) {
    this.tracker = tracker;

    if (manualApiKey) {
      this.apiKey = manualApiKey;
    } else {
      if (process.env.TOP_WEB_API_KEY) {
        this.apiKey = process.env.TOP_WEB_API_KEY;
      } else {
        throw new APIKeyMustGivenError(
          'API key not set for the web-top tracker server.' +
            'Please set TOP_WEB_API_KEY environment variable.'
        );
      }
    }

    // Don't shoot yourself to foot
    if (this.apiKey.length < 16) {
      throw new APIKeyMustGivenError(
        'API key is too weak. It must be more than 16 characters long'
      );
    }
  }

  /**
   * Check the API key is good.
   *
   * @param request
   * @param response
   */
  authenticate(
    request: http.IncomingMessage,
    response: http.ServerResponse
  ): boolean {
    if (request.method != 'GET') {
      response.statusCode = 500;
      response.end('Only GET method supported');
      return false;
    }

    // @ts-ignore
    const parsedUrl = new URL(request.url);
    const requestApiKey = parsedUrl.searchParams.get('api-key');
    if (!requestApiKey) {
      response.statusCode = 403;
      response.end('api-key parameter missing');
      return false;
    }

    if (requestApiKey != this.apiKey) {
      response.statusCode = 403;
      // Give a hint what could be wrong
      response.end(`API key ${requestApiKey.slice(0, 4)}... does not match`);
      return false;
    }

    return true;
  }

  /**
   * Get the active tasks
   */
  getActiveTasks() {
    this.tracker.activeTasks.entries();
  }

  /**
   * Serve the web-top client.
   *
   * @param request
   * @param response
   */
  serve(request: http.IncomingMessage, response: http.ServerResponse) {
    // Authentication failed?
    if (!this.authenticate(request, response)) {
      return;
    }

    const parsedUrl = new URL(request.url);
    const action = parsedUrl.searchParams.get('action');

    if (!action) {
      response.statusCode = 420;
      return response.end('action parameter missing');
    }

    if (action == WebTopServerActions.active_tasks) {
    }
  }
}
