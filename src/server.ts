/**
 * A server interface for web-top client to get the active tasks from this Node.js process.
 *
 */

import http from 'http';
import parseurl from 'parseurl';

import { Tracker } from './tracker';

/**
 *
 */
export enum WebTopServerActions {
  active_tasks = 'active-tasks',
  completed_tasks = 'completed-tasks',
}

/**
 * API key is not set.
 */
class APIKeyMustGivenError extends Error {}

/**
 * TrackerServer.serve() has invalid this.
 */
class InvalidBindError extends Error {}

/**
 * :(
 */
class BadUrlError extends Error {}

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
export class TrackerServer {
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
          'API key not set for the web-top tracker server.\n' +
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
    const requestApiKey = request.query['api-key'];
    if (!requestApiKey) {
      response.statusCode = 403;
      response.end('api-key parameter missing');
      return false;
    }

    if (requestApiKey != this.apiKey) {
      response.statusCode = 403;
      // Give a hint what could be wrong
      response.end(
        `API key ${requestApiKey.slice(
          0,
          4
        )}... does not match ${this.apiKey.slice(0, 4)}...`
      );
      return false;
    }

    return true;
  }

  /**
   * Get the active tasks
   */
  getActiveTasks(): ActiveTasksResponse {
    const tasks = this.tracker.activeTasks.entries();
    const resp: ActiveTasksResponse = {};
    for (const [key, value] of tasks) {
      resp[key] = value;
    }
    return resp;
  }

  /**
   * Get the completed tasks
   */
  getCompletedTasks(): CompletedTasksResponse {
    return this.tracker.completedTasks;
  }

  /**
   * Serve the web-top client.
   *
   * @param request
   * @param response
   */
  serve(request: http.IncomingMessage, response: http.ServerResponse) {
    if (!(this instanceof TrackerServer)) {
      throw new InvalidBindError(`Invalid this: ${this}`);
    }

    // Authentication failed?
    if (!this.authenticate(request, response)) {
      return;
    }

    const parsedUrl = parseurl(request);
    if (!parsedUrl) {
      throw new BadUrlError('Could not parse URL');
    }

    // @ts-ignore
    const action = request.query.action;

    if (!action) {
      response.statusCode = 420;
      return response.end('action parameter missing');
    }

    let data;
    if (action == WebTopServerActions.active_tasks) {
      data = this.getActiveTasks();
    } else if (action == WebTopServerActions.completed_tasks) {
      data = this.getCompletedTasks();
    } else {
      response.statusCode = 420;
      return response.end(`Invalid action parameter ${action}`);
    }

    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.write(JSON.stringify(data));
    response.end();
  }
}
