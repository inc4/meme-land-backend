import http from 'http';
import winston from 'winston';

import { webApp } from './web-app.js';
import { WinstonLoggerAdapter } from '../../adapters/index.js';
import config from '../../../config/index.js';


const logger = new WinstonLoggerAdapter(winston, config.logger);
const server = http.createServer(webApp);
server.listen(config.server.port);

server.on('listening', () => {
  logger.info(`Http server listening on port: ${config.server.port}`);
});

server.on('error', (err) => {
  logger.error(`Http server listening error: ${err}`);
  logger.end();
  process.exit(1);
});


