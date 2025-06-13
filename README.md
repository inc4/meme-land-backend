# meme-land-backend"

## docs
  
  Openapi file [here](./doc/openapi.yaml)

## deployment

- setup mongo db instance
- source files: /src, /config, package-lock.json, package.json
- fill env vars as in [example.env](./example.env)
- install dependencies: ```npm i```

## before start api server

  Admin wallet has to be added to user pool.

- Set up env var ADMIN_WALLET(admin wallet addresses separated by space, see [example.env](./example.env))
- run script: ```npm run register-admin```

## start api server

```npm run api-server```
