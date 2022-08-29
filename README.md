# Web-top-node

Display active and complete HTTP requests of your Node.js web server easily.
This package adds support for [web-top](https://github.com/tradingstrategy-ai/web-top)
for your application.

Supported web serves include, but not limited to

* [Node.js built-in HTTP server](https://nodejs.org/api/http.html)
* [Express](https://expressjs.com/)
* [Polka](https://github.com/lukeed/polka)
* All other Express-likes

## Features

- Use [web-top](https://github.com/tradingstrategy-ai/web-top) text user interface (TUI) client
  and REST API interface directly 
- Track active and completed HTTP requests
- Detect stalled or hung requests
- No separate software installation outside Node.js needed; `web-top-node` tracks 
  any HTTP requests inside Node.js process using internal memory table
- API key based authentication 
- Support for custom tracking tags
- [All features of web-top](https://github.com/tradingstrategy-ai/web-top) 

This tracker backend is suitable for tracking web servers with a single Node.js
process. If you are running a distributed web server with several Node.js
processes behind a load balancer, you need to use a 
[distributed tracker like Redis](https://top-framework.readthedocs.io/en/latest/redis.html)
or provide tracking interface directly from your load balancer.

# Install

From NPM:

```bash
npm install "@trading-strategy-ai/web-top-node@next"
```

# Usage

To enable tracking you need 
- Create tracker backend, with any custom tags you want to associated with your web server 
- Install middleware that will detect HTTP request start and end
- Create an API endpoint that will serve this data to `web-top` command line client
- The API endpoint is authenticated with an API key which is
  read from `TOP_WEB_API_KEY` environmenet variable by default

## With Express like web servers

Here is an example script 

- Using [Polka web server](https://github.com/lukeed/polka)
- Should be compatible with any Express web server based Node.js website

```javascript
/**
 * Polka example web server twith tracker.
 *
 *
 * To run this you need to set environment variable TOP_WEB_API_KEY
 * to a random string.
 *
 * export TOP_WEB_API_KEY=`node -e "console.log(crypto.randomBytes(20).toString('hex'));"`
 * echo "API key is $TOP_WEB_API_KEY"
 * node scripts/polka.js
 *
 */

import polka from 'polka';
import { Tracker, TrackerServer, createTrackerMiddleware } from '@trading-strategy-ai/web-top-node';

// Create Polka server
// See https://github.com/lukeed/polka
// for more information.
const app = polka();

// Create HTTP request tracker.
// This will store active and completed HTTP requests
// in Node.js process memory.
const tracker = new Tracker();

// Install HTTP request start/end hooks.
// If no max completed request buffer size is not given,
// read the max number from TOP_MAX_COMPLETED_TASKS
// environment variable, or default to 256 requests
// if not set.
const trackerMiddleware = createTrackerMiddleware(tracker);
app.use(trackerMiddleware);

// Install API endpoint.
// If no API key is given read one from
// TOP_WEB_API_KEY environment variable.
const trackerServer = new TrackerServer(tracker);

// Under which path we install the tracker API endpoint
const trackerPath = "/tracker";
app.get(trackerPath, trackerServer.serve.bind(trackerServer))

// Create Hello world landing page
app.get('/', async (req, res) => {
  res.end('Hello world');
});

// Start web server
app.listen(3000, () => {
  console.log('Listening on port 3000');
  console.log(`HTTP active requests API at ${trackerPath}, API key starts as ${trackerServer.apiKey.slice(0, 4)}…`);
});
```

Start the server above as:

```shell
export TOP_WEB_API_KEY=`node -e "console.log(crypto.randomBytes(20).toString('hex'));"`
echo "API key is $TOP_WEB_API_KEY"
node scripts/polka.js
```

Then you can access the connect `web-top` application or 
access the `/tracker` API endpoint directly (see below).


## With SvelteKit

Below is an example integration for [SvelteKit]() based websites
that use [adapter-node]() for production deployments.

```javascript
/**
 * Express.js based SvelteKit server-side renderer
 * with web-top HTTP request tracking API installed.
 *
 * To run this you need to set environment variable TOP_WEB_API_KEY
 * to a random string.
 *
 * export TOP_WEB_API_KEY=`node -e "console.log(crypto.randomBytes(20).toString('hex'));"`
 * echo "API key is $TOP_WEB_API_KEY"
 * node scripts/server.js
 *
 */

// Check your SvelteKit build/handler.js file
// location based on your SvelteKit installation
import { handler } from '../build/handler.js';
import express from 'express';
import { Tracker, TrackerServer, createTrackerMiddleware } from '@trading-strategy-ai/web-top-node';

// Create Polka server
// See https://github.com/lukeed/polka
// for more information.
// (Polka is the default for SvelteKit)
const app = express();

// Create HTTP request tracker.
// This will store active and completed HTTP requests
// in Node.js process memory.
const tracker = new Tracker();

// Install HTTP request start/end hooks.
// If no max completed request buffer size is not given,
// read the max number from TOP_MAX_COMPLETED_TASKS
// environment variable, or default to 256 requests
// if not set.
const trackerMiddleware = createTrackerMiddleware(tracker);
app.use(trackerMiddleware);

// Install API endpoint.
// If no API key is given read one from
// TOP_WEB_API_KEY environment variable.
const trackerServer = new TrackerServer(tracker);

// Under which path we install the tracker API endpoint
const trackerPath = "/tracker";
app.use(trackerPath, trackerServer.serve.bind(trackerServer))

// Install SvelteKit server-side renderer
app.use(handler);

// Start web server
app.listen(3000, () => {
  console.log('Listening on port 3000');
  console.log(`HTTP active requests API at ${trackerPath}, API key starts as ${trackerServer.apiKey.slice(0, 4)}…`);
});
```

[See open issue with SvelteKit that may affect you](https://github.com/sveltejs/kit/issues/6363).

# Tracker API endpoint

You can access the tracker server API endpoint as following

## View active HTTP requests

Example URL - fill in your own API key:

```
http://localhost:3000/tracker?api-key=...&action=active-tasks
```

## View completed HTTP request/responses

```
http://localhost:3000/tracker?api-key=...&action=completed-tasks
```

# API documentation

Browse source code on Github.

- [Tracker](./src/tracker.ts)
- [Middleware](./src/middleware.ts)
- [Tracker API endpoint](./src/server.ts)

# Release

To roll out a new package version:

```shell
bash scripts/release.sh
```