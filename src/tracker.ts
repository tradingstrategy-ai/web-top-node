/** If not set what is the size of completed tasks ring buffer */
import {IncomingHttpHeaders, IncomingMessage, OutgoingHttpHeaders, ServerResponse} from "http";
import {getDefaultTags, updateProcessInfo} from "./worker";


const DEFAULT_MAX_COMPLETED_TASKS = 50;


class CannotHandleRequest extends Error {
}

class CannotTrackRequest extends Error {
}

/**
 * Track currently active and past HTTP requests in Node.
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
    tags: string[];

    /** Running counter to assign ids for requests */
    requestCounter: number;

    constructor(maxCompletedTasks?: number, tags?: string[]) {
        this.activeTasks = new Map();
        this.completedTasks = [];
        this.tags = tags || [];

        this.requestCounter = 1;

        if(maxCompletedTasks) {
            this.maxCompletedTasks = maxCompletedTasks;
        } else {
            if(process.env.TOP_MAX_COMPLETED_TASKS) {
                this.maxCompletedTasks = parseInt(process.env.TOP_MAX_COMPLETED_TASKS)
            } else {
                this.maxCompletedTasks = DEFAULT_MAX_COMPLETED_TASKS;
            }
        }
    }

    /**
     * Start tracking a new web request.
     *
     * @param request Incoming HTTP requests
     *
     * @param tags Additional tags we want to track for this request
     */
    startRequest(request: IncomingMessage, tags?: string[]) {

        tags = tags || [];

        if(!request.url) {
            throw new CannotHandleRequest(`request.url missing on ${request}`);
        }

        const url = new URL(request.url);

        const address = request.socket.remoteAddress;

        const task: HTTPTask = {
            protocol: url.protocol,
            host: url.host,
            method: request.method,
            path: url.pathname,
            params: url.searchParams,
            tags: tags.concat(getDefaultTags(), this.tags),
            client_ip_address: address,
        };

        // TODO: How does Node.js handle request header repeat?
        task.request_headers = convertHeadersToTuples(request.headers);

        updateProcessInfo(task);

        task.started_at = task.updated_at = new Date().toISOString();


        const trackingId = this.requestCounter++;
        // @ts-ignore
        request.trackingId = trackingId;

        // @ts-ignore
        request.trackingTask = task;

        this.activeTasks.set(trackingId, task);
    }

    /**
     * Mark a request complete.
     *
     * Include HTTP response data in the task description.
     *
     * @param request
     * @param response
     */
    endTask(request: IncomingMessage, response: ServerResponse) {

        // @ts-ignore
        const trackingId: number = request.trackingId || null;

        // @ts-ignore
        const task: HTTPTask = request.trackingTask || null;

        // Do some internal integrity checks
        if(!trackingId) {
            throw new CannotTrackRequest(`request instance did not have reuest.trackingId set`);
        }

        if(!task) {
            throw new CannotTrackRequest(`request instance did not have request.trackingTask set`);
        }

        const activeTask = this.activeTasks.get(trackingId);
        if(!activeTask) {
            throw new CannotTrackRequest(`No activeTask set for tracking id ${trackingId}`);
        }

        task.ended_at = task.updated_at = new Date().toISOString();

        task.status_code = response.statusCode;
        task.status_message = response.statusMessage;
        task.response_headers = convertHeadersToTuples(response.getHeaders())

        this.moveToCompleted(trackingId, task);
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
 */
function convertHeadersToTuples(headers: IncomingHttpHeaders | OutgoingHttpHeaders): Array<string[]> {
    let convertedHeaders: Array<string[]> = []
    for(let key in headers) {
        let value = headers[key] || "";
        if(Array.isArray(value)) {
            for(let subvalue of value) {
                convertedHeaders.push([key, subvalue]);
            }
        } else {
            convertedHeaders.push([key, value.toString()]);
        }
    }
    return convertedHeaders;
}