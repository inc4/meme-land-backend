import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import winston from 'winston';

import { PresaleContractAdapter, WinstonLoggerAdapter } from '../../adapters/index.js';
import { walletModel, WalletService } from '../../domain/index.js';
import { DataPageComposer } from '../../libs/index.js'
import config from '../../../config/index.js';



async function main() {
  try {
    const adminWalletList = process.env.ADMIN_WALLET;

    if (!adminWalletList) {
      throw Error('No admin wallets specified');
    }

    await mongoose.connect(config.mongo.url, config.mongo.options);
    const logger = new WinstonLoggerAdapter(winston, config.logger);
    const presaleContractAdapter = new PresaleContractAdapter(logger, config.anchorOptions, false);
    const walletService = new WalletService(
      walletModel,
      presaleContractAdapter,
      DataPageComposer.composePageInfo,
      logger
    );

    const wallets = adminWalletList.split(' ');

    for (const wallet of wallets) {
      let walletInfo = await walletService.getSingle(wallet);
      if (!walletInfo) {
        walletInfo = await walletService.addSingle({ referrer: wallet, wallet: wallet, isAdmin: true });
        logger.info('Admin wallet successfully registered: ', walletInfo);
      } else {
        logger.info('Admin wallet previously existed: ', walletInfo);
      }
    }
  } catch (err) {
    logger.error('Admin wallet registration error: ', err);
  }
  process.exit(0);
}

main();
