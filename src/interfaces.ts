/**
 * Top framework wire protocol interface definitions.
 */

/**
 * All dates are serialised as ISO-8601 in the wire protocol.
 */
type ISO8601Date = string;

/**
 * Telemetry tag map definition.
 *
 * For inspiration,
 * see OpenTelemetry attributes https://lightstep.com/opentelemetry/attributes-and-labels
 *
 * Tag keys may be namespaced with dot.
 *
 * Example attribute names include
 *
 * - `node.version` (see getDefaultTags)
 * - `service.name`
 * - `service.version`
 */
interface Tags {
  [key: string]: string;
}

/**
 * WSGI like multiple HTTP header serialisation.
 *
 * Headers are a list of key:value string tuples,
 * each key can repeat.
 *
 * For the convention, all header names are uppercased
 * and any comparison is case-insensitive.
 *
 */
type WSGILikeHeaders = Array<string[]>;

/**
 * Core tracked task.
 *
 * Serialisation format for Top framework JSON.
 *
 * See https://top-framework.readthedocs.io/en/latest/reference/api/top.core.task.Task.html#top.core.task.Task
 */
interface Task {
  task_id?: number | string;
  task_name?: string;
  host_name?: string;
  process_id?: number;
  thread_id?: number;
  process_internal_id?: string;
  processor_name?: string;
  started_at?: ISO8601Date;
  updated_at?: ISO8601Date;
  ended_at?: ISO8601Date;
  recorded_successfully?: boolean;
  tags?: Tags;
}

/**
 * HTTP request/response task.
 *
 * Serialisation format for Top framework JSON.
 *
 * See https://top-framework.readthedocs.io/en/latest/reference/api/top.web.task.HTTPTask.html
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
  request_headers?: WSGILikeHeaders;
  // TODO: Define more carefully
  response_headers?: WSGILikeHeaders;
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
interface CompletedTasksResponse extends Array<HTTPTask> {}
