/**
 * Internal request tracking backend for Node.js
 */
import {
  IncomingHttpHeaders,
  IncomingMessage,
  OutgoingHttpHeaders,
  ServerResponse,
} from 'http';
import { getDefaultTags, updateProcessInfo } from './worker';
import parseurl from 'parseurl';

/** If not set what is the size of completed tasks ring buffer */
export const DEFAULT_MAX_COMPLETED_TASKS = 256;

/** Something from with Request object and cannot read it */
class CannotHandleRequest extends Error {}

/** Tracking of the request failed for some reason */
class CannotTrackRequest extends Error {}

// https://stackoverflow.com/a/55641743/315168
const trim = (str: string, chars: string) =>
  str.split(chars).filter(Boolean).join(chars);

/**
 * Track currently active and past HTTP requests in Node.js.
 *
 * This hooks into the web server via startTask/endTask functions.
 */
export class Tracker {
  /** Tracked ongoing requestes */
  activeTasks: Map<number, HTTPTask>;

  /** Tracked completed responses.
   *
   *
   *
   */
  completedTasks: HTTPTask[];

  /** How many completed requests we keep in our ring buffer */
  maxCompletedTasks: number;

  /** Application tags used in monitoring. E.g. the version number and such */
  tags: Tags;

  /** Running counter to assign ids for requests */
  requestCounter: number;

  /** Do not track these paths
   *
   * Blacklist of paths that should not go to the tracking.
   * E.g. `/tracker` API requests themselves.
   */
  ignorePaths: string[];

  /**
   * Creates a new Tracker.
   *
   * @param maxCompletedTasks
   *  Number of completed requests to keep in the buffe.r
   *  If not given use `process.env.TOP_MAX_COMPLETED_TASKS`
   *
   * @param tags
   *  If not given use getDefaultTags()
   *
   * @param ignorePaths
   *  Do not track these paths (like tracker itself).
   */
  constructor(maxCompletedTasks?: number, tags?: Tags, ignorePaths?: string[]) {
    this.activeTasks = new Map();
    this.completedTasks = [];
    this.tags = tags || getDefaultTags();

    if (!ignorePaths) {
      ignorePaths = ['/tracker'];
    }
    this.ignorePaths = ignorePaths;

    this.requestCounter = 1;

    if (maxCompletedTasks) {
      this.maxCompletedTasks = maxCompletedTasks;
    } else {
      if (process.env.TOP_MAX_COMPLETED_TASKS) {
        this.maxCompletedTasks = parseInt(process.env.TOP_MAX_COMPLETED_TASKS);
      } else {
        this.maxCompletedTasks = DEFAULT_MAX_COMPLETED_TASKS;
      }
    }
  }

  /**
   * Should we ignore this HTTP request?
   *
   * Do the path based check based on `ignorePath` list.
   */
  isIgnoredRequest(request: IncomingMessage): boolean {
    const url = parseurl(request);
    if (!url) {
      return false;
    }
    const path = url.pathname || '';
    return this.ignorePaths.includes(path);
  }

  /**
   * Start tracking a new web request.
   *
   * Sets `trackingId` and `trackingTask` properties on the request.
   *
   * @param request Incoming HTTP requests
   *
   * @param tags Additional tags we want to track for this request
   *
   * @return The task that tracks the request
   *  or null if the request is on ignore list
   */
  startTask(request: IncomingMessage, tags?: Tags): HTTPTask | null {
    if (this.isIgnoredRequest(request)) {
      return null;
    }

    tags = tags || {};

    if (!request.url) {
      throw new CannotHandleRequest(`request.url missing on ${request}`);
    }

    // We use parseurl from Express.js
    // because we must be able to parse incomplete urls like /tracker
    // and new URL() cannot do this
    const url = parseurl(request);
    if (!url) {
      throw new CannotHandleRequest(`request.url unparseable`);
    }

    const trackingId = this.requestCounter++;
    const address = request.socket.remoteAddress;

    // Currently we record HTTP GET params only
    // @ts-ignore
    const params = request.query || undefined;

    const task: HTTPTask = {
      task_id: trackingId,
      // @ts-ignore
      protocol: (url.protocol && trim(url.protocol, ':')) || null, // no ending :
      // @ts-ignore
      host: url.host,
      method: request.method,
      path: url.pathname || undefined,
      params: params,
      tags: { ...this.tags, ...tags },
      client_ip_address: address,
    };

    task.request_headers = convertHeadersToTuples(request.headers);

    updateProcessInfo(task);

    task.started_at = task.updated_at = new Date().toISOString();

    // @ts-ignore
    request.trackingId = trackingId;

    // @ts-ignore
    request.trackingTask = task;

    this.activeTasks.set(trackingId, task);

    return task;
  }

  /**
   * Mark a request complete.
   *
   * Include HTTP response data in the task description.
   *
   * @param request
   * @param response
   *
   * @return The task that tracks the request
   *  or null if the request is on ignore list
   */
  endTask(request: IncomingMessage, response: ServerResponse): HTTPTask | null {
    if (this.isIgnoredRequest(request)) {
      return null;
    }

    // @ts-ignore
    const trackingId: number = request.trackingId || null;

    // @ts-ignore
    const task: HTTPTask = request.trackingTask || null;

    // Do some internal integrity checks
    if (!trackingId) {
      throw new CannotTrackRequest(
        `request instance did not have request.trackingId set: ${request.url}`
      );
    }

    if (!task) {
      throw new CannotTrackRequest(
        `request instance did not have request.trackingTask set: ${request.url}`
      );
    }

    const activeTask = this.activeTasks.get(trackingId);
    if (!activeTask) {
      throw new CannotTrackRequest(
        `No activeTask set for tracking id ${trackingId}`
      );
    }

    task.ended_at = task.updated_at = new Date().toISOString();

    task.status_code = response.statusCode;
    task.status_message = response.statusMessage;
    task.response_headers = convertHeadersToTuples(response.getHeaders());
    task.recorded_successfully = true;

    this.moveToCompleted(trackingId, task);

    return task;
  }

  /**
   * Move a task from active task list to completed task list.
   *
   * @param trackingId Active task tracking id
   *
   * @param task
   */
  moveToCompleted(trackingId: number, task: HTTPTask) {
    this.activeTasks.delete(trackingId);
    this.completedTasks.splice(0, 0, task);
    this.completedTasks = this.completedTasks.slice(0, this.maxCompletedTasks);
  }
}

/**
 * Convert headers from IncomingMessage and OutgoingMessage to Top Framework format.
 *
 * - Node.js: Multiple headers are presented as value array instead of value string
 *
 * - Top framework: Multipel headers are presented as repeated tuples in an array
 *
 * - All header names are converted to upper case
 */
export function convertHeadersToTuples(
  headers: IncomingHttpHeaders | OutgoingHttpHeaders
): WSGILikeHeaders {
  let convertedHeaders: Array<string[]> = [];
  for (let key in headers) {
    let value = headers[key] || '';
    if (Array.isArray(value)) {
      for (let subvalue of value) {
        convertedHeaders.push([key.toUpperCase(), subvalue]);
      }
    } else {
      convertedHeaders.push([key.toUpperCase(), value.toString()]);
    }
  }
  return convertedHeaders;
}
