import express from 'express';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import mongoose from 'mongoose';

import { WinstonLoggerAdapter, PresaleContract, } from '../../adapters/index.js';
import { walletModel, WalletService } from '../../domain/index.js';
import { WalletController } from '../../controllers/index.js'
import { Authentication } from '../../middlewares/index.js'
import { HttpErrorBody, RequestInputsParser, DataPageComposer } from '../../libs/index.js'

import config from '../../../config/index.js';

import { SwaggerController } from '../../../doc/index.js';

// init components
const app = express();
const router = new express.Router();
const logger = new WinstonLoggerAdapter(winston, config.logger);


mongoose.connect(config.mongo.url, config.mongo.options);
const presaleContract = new PresaleContract();
const walletService = new WalletService(walletModel, presaleContract);
const walletController = new WalletController(walletService, HttpErrorBody.compose);

const swaggerController = new SwaggerController();

const auth = new Authentication(HttpErrorBody.compose);

// add pre middlewares
app.use((req, res, next) => {
  // Try get ip from cloudflare headers
  // then nginx headers(nginx.conf: proxy_set_header  X-Real-IP  $remote_addr;)
  // then native nodejs http headers
  const ip = req.headers['cf-connecting-ip'] ?? req.headers['x-real-ip'] ?? req.socket.remoteAddress;
  const requestId = uuidv4();
  req.requestOpts = logger.composeRequestOpts(requestId, ip);
  logger.debug(`${req.method} ${req.path}`, req.requestOpts);
  next();
});
app.use(cors(config.CORS.defaultCorsOptions));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// register swagger controllers
swaggerController.registerRoutes(router);

// add auth
router.use(auth.retrieveRequesterWallet.bind(auth));


// register wallet controllers
walletController.registerRoutes(router);

app.use('/api/1.0.0', router);

// handle unknown route
app.use((req, res, next) => {
  const err = new Error(`Cannot ${req.method} ${req.path}`);
  res.status(404).end();
  return next(err);
});

// handle app errors
app.use((err, req, res, next) => logger.warn(err.stack, req.requestOpts));

// set app global error handlers
process
  .on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
    logger.end();
    process.exit(1);
  })
  .on('uncaughtException', (err, origin) => {
    logger.error(`Uncaught Exception: ${err}, origin: ${origin}`);
    logger.end();
    process.exit(1);
  });


export const webApp = app;
