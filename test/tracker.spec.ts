/**
 * Testing Node.js request tracking backend.
 */

import { DEFAULT_MAX_COMPLETED_TASKS, Tracker } from '../src/tracker';
import { IncomingMessage, ServerResponse } from 'http';
import { getDefaultTags } from '../src';

function generateMockRequest(url?: string): IncomingMessage {
  const mockSocket = {
    remoteAddress: '127.0.0.1',
  };
  // @ts-ignore
  const request = new IncomingMessage(mockSocket);

  if (!url) {
    url = 'https://example.com/foobar?name=grumpy';
  }

  request.url = url;
  request.method = 'GET';
  request.headers = {
    'user-agent': 'Mochi mochi dayo!',
  };
  return request;
}

describe('tracker', () => {
  describe('Tracker', () => {
    it('should track a new request', () => {
      const tracker = new Tracker(
        DEFAULT_MAX_COMPLETED_TASKS,
        getDefaultTags(),
        []
      );
      const request = generateMockRequest();
      const task = tracker.startTask(request);

      if (!task) {
        throw new Error('Task expected');
      }

      expect(tracker.activeTasks.size).toEqual(1);

      // Check some task parameters
      expect(task.task_id).toEqual(1);

      // URI parameters
      expect(task.protocol).toEqual('https');
      expect(task.path).toEqual('/foobar');
      expect(task.method).toEqual('GET');
      expect(task.host).toEqual('example.com');
      expect(task.request_headers).toEqual([
        ['USER-AGENT', 'Mochi mochi dayo!'],
      ]);

      // Connection
      expect(task.client_ip_address).toEqual('127.0.0.1');

      // Process parameters
      expect(task.host_name).not.toBeUndefined();
      expect(task.thread_id).toBeUndefined();
      expect(task.process_id).toBeGreaterThan(0);

      // Tags
      expect(task.tags).not.toBeUndefined();
      // @ts-ignore
      expect(task.tags['node.platform']).not.toBeUndefined();

      // Timing
      expect(task.started_at).not.toBeUndefined();
      expect(task.updated_at).not.toBeUndefined();

      // Response parameters not yet set
      expect(task.status_code).toBeUndefined();
      expect(task.status_message).toBeUndefined();
    });

    it('should finish a request tracking', () => {
      const tracker = new Tracker(DEFAULT_MAX_COMPLETED_TASKS, {}, []);
      const request = generateMockRequest();
      const response = new ServerResponse(request);

      response.statusCode = 200;
      response.statusMessage = 'OK';

      request.url = 'https://example.com/foobar?name=grumpy';
      request.method = 'GET';

      tracker.startTask(request);
      const task = tracker.endTask(request, response);

      if (!task) {
        throw new Error('Task expected from endTask()');
      }

      // Task is correctly marked as completed
      expect(task.ended_at).not.toBeUndefined();
      expect(task.ended_at).toEqual(task.updated_at);
      expect(task.status_code).toEqual(200);
      expect(task.status_message).toEqual('OK');
      expect(task.recorded_successfully).toEqual(true);

      // Check bookkeeping
      expect(tracker.activeTasks.size).toEqual(0);
      expect(tracker.completedTasks.length).toEqual(1);
    });

    it('should not overflow completed requests', () => {
      const tracker = new Tracker(DEFAULT_MAX_COMPLETED_TASKS, {}, []);
      const bombCount = 500;

      for (let i = 0; i < bombCount; i++) {
        const request = generateMockRequest();
        const response = new ServerResponse(request);
        tracker.startTask(request);
        tracker.endTask(request, response);
      }

      expect(tracker.activeTasks.size).toEqual(0);
      expect(tracker.completedTasks.length).toEqual(
        DEFAULT_MAX_COMPLETED_TASKS
      );

      expect(tracker.completedTasks[0].task_id).toEqual(500);
      // @ts-ignore
      expect(tracker.completedTasks.at(-1).task_id).toEqual(245);
    });

    it('should ignore named requests', () => {
      const tracker = new Tracker(DEFAULT_MAX_COMPLETED_TASKS, {}, [
        '/tracker',
      ]);
      const request = generateMockRequest(
        'https://example.com/tracker?api-key=grumpy'
      );
      expect(tracker.isIgnoredRequest(request)).toEqual(true);
      const task = tracker.startTask(request);
      expect(task).toBeNull();
    });
  });
});
