import dotenv from 'dotenv';
dotenv.config();

import { PresaleContractAdapter } from './presale.js'




async function main() {
  const token = {
    name: "MemLand Token LOX",
    symbol: "LOX",
  };
  const campaignStatus = 'presaleFinished';

  const presale = new PresaleContractAdapter();

  console.log(presale.payer.publicKey.toBase58());

  await presale.setCampaignStatus(token.name, token.symbol, campaignStatus);

  presale.addEventListener('ParticipateEvent', (event, slot) => {
    console.log(`🎉 [ParticipateEvent] (слот ${slot}):`);
    console.dir(event, { depth: null });
  });

}

main()
  .then(() => {
    console.log('test done');
  })
  .catch((err) => {
    console.log(err);
  });