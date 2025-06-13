import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

import { PresaleContract, } from '../../adapters/index.js';
import { walletModel, WalletService } from '../../domain/index.js';
import config from '../../../config/index.js';



async function main() {
  const adminWallet = process.env.ADMIN_WALLET;
  const presaleContract = new PresaleContract();
  const walletService = new WalletService(walletModel, presaleContract);
  await mongoose.connect(config.mongo.url, config.mongo.options);
  return await walletService.addSingle({ referrer: adminWallet, wallet: adminWallet, isAdmin: true });
}

main()
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    console.log(err);
  });
