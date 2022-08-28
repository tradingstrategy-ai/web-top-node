# Web-top-node

Display active and complete HTTP requests of your web server easily.
Node.js web server support for [web-top](https://github.com/tradingstrategy-ai/web-top).

Supported web serves include, but not limited to

* [Node.js built-in HTTP server](https://nodejs.org/api/http.html)
* [Express](https://expressjs.com/)
* [Polka](https://github.com/lukeed/polka)
* All other Express-likes

## Features

- Use [web-top](https://github.com/tradingstrategy-ai/web-top) client
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
[distributed tracker like Redis](https://top-framework.readthedocs.io/en/latest/redis.html).

# Install

From NPM:

```bash
npm install web-top-node
```

## Usage

To enable tracking you need 
- Create tracker backend, with any custom tags you want to associated with your web server 
- Install middleware that will detect HTTP request start and end
- Create an API endpoint that will serve this data to `web-top` command line client

```ts
import { myPackage } from 'my-package-name';

myPackage('hello');
//=> 'hello from my package'
```

# API

Browse source code on Github.

- [Tracker](./src/tracker.ts)
- [Middleware](./src/middleware.ts)
- [Tracker API endpoint](./src/server.ts)
