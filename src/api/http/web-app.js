import express from 'express';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import mongoose from 'mongoose';

import { WinstonLoggerAdapter, PresaleContractAdapter } from '../../adapters/index.js';
import {
  walletModel,
  WalletService,
  campaignModel,
  CampaignService,
  participationModel,
  ParticipationService
} from '../../domain/index.js';
import { WalletController, CampaignController, ParticipationController } from '../../controllers/index.js'
import { Authentication } from '../../middlewares/index.js'
import { HttpErrorBody, RequestInputsParser, DataPageComposer } from '../../libs/index.js'

import config from '../../../config/index.js';

import { SwaggerController } from '../../../doc/index.js';

// init components
const app = express();
const router = new express.Router();
const logger = new WinstonLoggerAdapter(winston, config.logger);


mongoose.connect(config.mongo.url, config.mongo.options);



const presaleContractAdapter = new PresaleContractAdapter(logger, config.anchorOptions);
const walletService = new WalletService(
  walletModel,
  presaleContractAdapter,
  DataPageComposer.composePageInfo,
  logger
);

const walletController = new WalletController(
  walletService,
  HttpErrorBody.compose,
  RequestInputsParser.parseRequestQueryParam
);

const campaignService = new CampaignService(
  campaignModel,
  presaleContractAdapter,
  DataPageComposer.composePageInfo,
  config.presaleDefaults,
  logger
);

const campaignController = new CampaignController(
  campaignService,
  HttpErrorBody.compose,
  RequestInputsParser.parseRequestQueryParam
);

const participationService = new ParticipationService(
  participationModel,
  campaignService,
  presaleContractAdapter,
  DataPageComposer.composePageInfo,
  logger
);

const participationController = new ParticipationController(
  participationService,
  HttpErrorBody.compose,
  RequestInputsParser.parseRequestQueryParam
);

const swaggerController = new SwaggerController();

const auth = new Authentication(walletModel, HttpErrorBody.compose);

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

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(cors(config.CORS.defaultCorsOptions));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// register swagger controllers
swaggerController.registerRoutes(router);

// add auth
router.use(auth.retrieveRequester.bind(auth));


// register wallet controllers
walletController.registerRoutes(router);

// register campaign controllers
campaignController.registerRoutes(router);

// register participation controllers
participationController.registerRoutes(router);

// add api routes to app
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
