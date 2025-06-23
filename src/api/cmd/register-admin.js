import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

import { PresaleContractAdapter, } from '../../adapters/index.js';
import { walletModel, WalletService } from '../../domain/index.js';
import config from '../../../config/index.js';



async function main() {
  const adminWalletList = process.env.ADMIN_WALLET;

  if (!adminWalletList) {
    throw Error('No admin wallets specified');
  }
  
  await mongoose.connect(config.mongo.url, config.mongo.options);
  const presaleContractAdapter = new PresaleContractAdapter();
  const walletService = new WalletService(walletModel, presaleContractAdapter);

  const createdWalletPromises = adminWalletList.split(' ').map((wallet) => {
    return walletService.addSingle({ referrer: wallet, wallet: wallet, isAdmin: true });
  });

  return await Promise.all(createdWalletPromises);
}

main()
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    console.log(err);
  });
