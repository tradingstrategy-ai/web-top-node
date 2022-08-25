/**
 * A server interface for web-top client to get the active tasks from this Node.js process.
 */

import {Tracker} from "./tracker";

/**
 *
 */
enum WebTopServerActions {
    active_tasks = "active_tasks",
    completed_tasks = "completed_tasks"
}


/**
 * API key is not set.
 */
class APIKeyMustGivenError extends Error {
}

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

    }

    function server(
}



function createWebTopServer(tracker: Tracker, apiKey?: string) {

}