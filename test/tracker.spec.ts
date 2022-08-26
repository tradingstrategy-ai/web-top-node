import { myPackage } from '../src';
import {Tracker} from "../src/tracker";
import {IncomingMessage} from "http";

describe('tracker', () => {

  const tracker = new Tracker();

  describe('Tracker', () => {
    it('should track a new request', () => {
      const mockSocket = {};
      const request = new IncomingMessage(mockSocket);

      request.url = "https://example.com/foobar?name=grumpy";
      request.method = "GET";

      const task = tracker.startRequest(request);
      expect(tracker.activeTasks.size).toEqual(1);

      // Check some task parameters
      expect(task.task_id).toEqual(tracker.requestCounter - 1);

      // URI parameters
      expect(task.protocol).toEqual("https:");
      expect(task.path).toEqual("/foobar");
      expect(task.method).toEqual("GET");
      expect(task.host).toEqual("example.com");

      // Process parameters
      expect(task.host_name).not.toBeUndefined();
      expect(task.thread_id).toBeUndefined();
      expect(task.process_id).toBeGreaterThan(0);

      // Tags
      expect(task.tags).not.toBeUndefined();
      // @ts-ignore
      expect(task.tags["node-version"]).not.toBeUndefined();

      // Response parameters not yet set
      expect(task.status_code).toBeUndefined();
      expect(task.status_message).toBeUndefined();
    });


  });


});
