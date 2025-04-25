# React Example

This example intends to be a generic example of how to use `csrf-csrf`. Whilst the example is React based the backend configuration is catered to serving an SPA frontend client, or any other client which is being independently hosted of the API. The example assumes that the frontend is hosted cross-site to the backend API. In a case where the frontend is not hosted cross-site to the backend you would want to ensure the CSRF cookie has `sameSite` set to `strict`.

If you aren't sure whether requests from your frontend to your backend are considered cross-site, check the ["What is considered a cross-site request?"](../../FAQ.md#additional-resources) in the FAQ.

For this particular example it would actually be better to use `csrf-sync` instead, however this is for demonstrative purposes of `csrf-csrf`.

The React app attempts to take on and follow the principles of [bulletproof-react](https://github.com/alan2207/bulletproof-react/tree/master/apps/react-vite) but does not do so exhaustively as it's just an example, the backend attempts to translate the same principles.

## Running the example

### With Docker

The example will make use of the below ports, so make sure these ports are available, otherwise you can change them in the `docker-compose.yml` configuration.

* 3700 for the frontend client (react)
* 3710 for the backend API (express port)
* 3779 for redis (6379 on the container) (this is only needed if you want to run the backend API locally instead of within docker)
* 9229 for remote debugging of the backend

In `backend` run:

```bash
npm install
npm run build
```

Then from this directory (`example/react`) run:

```bash
docker compose up -d
```
Once the containers are up and running, you should find the React app at http://localhost:3700/

Tear it down with

```bash
docker compose down
```
from the same directory.

### Without Docker

By default Docker is much easier, however you can run without Docker.

1. Run `npm install` in both `backend` and `client`
2. Create a `.env` file in `backend` and populate it appropriately:

```
EXAMPLE_CSRF_SECRET=Fake CSRF secret
EXAMPLE_ALLOWED_ORIGINS="http://localhost:3700"
EXAMPLE_API_PORT=3710
EXAMPLE_SESSION_SECRET=Fake session secret
EXAMPLE_REDIS_HOST=localhost
EXAMPLE_REDIS_PORT=3779
NODE_ENV=development
```
3. Create a `.env` file in `client` and populate it appropriately:

```
VITE_EXAMPLE_BASE_API_URL=http://localhost:3710
```
4. Make sure you have a working `redis` instance and that it's configured appropriately in the above environment files
    * You could run via Docker first (as above) and then stop the `csrf-client` and `csrf-backend` containers, leaving the `csrf-redis` container.
    * Alternatively give the `redis` service a docker-compose profile and only run that.
5. Run `npm run dev` in `backend` from one terminal
6. Run `npm run dev` in `client` from another terminal

### Watch Mode

If you want to make changes to the backend and have them update automatically, make sure to run `npm run watch` within `backend` from a terminal. Changes will be applied without needing to rebuild or restart the container.

For the client, the Vite watch mode is enabled by default. Any changes made to the client will be replicated in the container, hot reloading will work as expected.

### Development

For local development of the example you will want to run `npm install` under both of the `client` and the `backend`. Once you have the containers running, if you want or need to install a new dependency, you'll need to re-run `npm install` on the container as well. You can do this by connecting to the container and running `npm install` from the `/app` directory

```bash
docker exec -it csrf-backend sh
docker exec -it csrf-client sh
```

