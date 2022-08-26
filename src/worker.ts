/**
 * Worker information management.
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
 */
export function getDefaultTags(): Tags {
  return {platform: process.platform, "node-version": process.version};
}
