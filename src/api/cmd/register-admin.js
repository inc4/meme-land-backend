import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import winston from 'winston';

import { PresaleContractAdapter, WinstonLoggerAdapter } from '../../adapters/index.js';
import { walletModel, WalletService } from '../../domain/index.js';
import { DataPageComposer } from '../../libs/index.js'
import config from '../../../config/index.js';



function toWalletSaveView(wallet) {
  return wallet.substring(0, 4);
}

async function main() {
  await mongoose.connect(config.mongo.url, config.mongo.options);
  const logger = new WinstonLoggerAdapter(winston, config.logger);
  const presaleContractAdapter = new PresaleContractAdapter(logger, config.anchorOptions, false);
  const walletService = new WalletService(
    walletModel,
    presaleContractAdapter,
    DataPageComposer.composePageInfo,
    logger
  );

  try {

    // Register admins
    const adminWalletList = process.env.ADMIN_WALLET;
    if (adminWalletList) {
      const adminWallets = adminWalletList.split(' ');
      for (const wallet of adminWallets) {
        let walletInfo = await walletService.getSingle(wallet);
        if (!walletInfo) {
          walletInfo = await walletService.addSingle({ referrer: wallet, wallet: wallet, isAdmin: true });
          logger.info('Admin wallet successfully registered: ', { wallet: `${toWalletSaveView(wallet)}...` });
        } else {
          logger.info('Admin wallet previously existed: ', { wallet: `${toWalletSaveView(wallet)}...` });
        }
      }
    } else {
      logger.warn('No admin wallets specified');
    }

    // Register guest users
    const guestUsersList = process.env.GUEST_USERS_WALLET;
    if (guestUsersList) {
      const guestWallets = guestUsersList.split(' ');
      for (const wallet of guestWallets) {
        let walletInfo = await walletService.getSingle(wallet);
        if (!walletInfo) {
          walletInfo = await walletService.addSingle({ referrer: wallet, wallet: wallet, isAdmin: false });
          logger.info('Guest wallet successfully registered: ', { wallet: `${toWalletSaveView(wallet)}...` });
        } else {
          logger.info('Guest wallet previously existed: ', { wallet: `${toWalletSaveView(wallet)}...` });
        }
      }
    } else {
      logger.warn('No guest wallets specified');
    }

  } catch (err) {
    logger.error('Admin wallet registration error: ', err);
  }
  process.exit(0);
}

main();
