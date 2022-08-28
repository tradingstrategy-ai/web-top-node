/**
 * Capture information about Node.js worker process.
 */
import * as os from 'os';

export function updateProcessInfo(task: Task) {
  task.process_id = process.pid;
  // No threads in Node
  task.thread_id = undefined;
  task.host_name = os.hostname();
}

/**
 * Get some default tags we can extract from the Node.js run-time environment.
 *
 * See OpenTelemetry attributes https://lightstep.com/opentelemetry/attributes-and-labels
 * for inspiration.
 */
export function getDefaultTags(): Tags {
  return {
    'node.platform': process.platform,
    'node.version': process.version
  };
}
