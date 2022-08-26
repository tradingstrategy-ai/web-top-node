/**
 * Top framework wire protocol interface definitions.
 */

//const ISO8601DateString = string;

/**
 * Telemetry tag map definition.
 */
interface Tags {
  [key: string]: string;
}

/**
 * Core tracked task.
 */
interface Task {
  task_id?: number | string;
  task_name?: string;
  host_name?: string;
  process_id?: number;
  thread_id?: number;
  process_internal_id?: string;
  processor_name?: string;
  started_at?: string;
  updated_at?: string;
  ended_at?: string;
  recorded_successfully?: boolean;
  tags?: Tags;
}

/**
 * HTTP request/response task.
 */
interface HTTPTask extends Task {
  protocol?: string;
  host?: string;
  method?: string;
  path?: string;
  params?: Map<string, string>;
  uri?: string;
  client_ip_address?: string;
  // TODO: Define more carefully
  request_headers?: Array<string[]>;
  // TODO: Define more carefully
  response_headers?: Array<string[]>;
  status_code?: number;
  status_message?: string;
}


/**
 * JSON response for the active tasks action
 */
interface ActiveTasksResponse {
  [key: string]: HTTPTask;
}

/**
 * JSON response for the completed tasks action
 */
interface CompletedTasksResponse extends Array<HTTPTask> {

}
