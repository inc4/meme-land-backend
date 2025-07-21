import { ProfitChance } from './profit-chance.js'

// { tokenSupply: 1000000000, fundsToLP: '10', buybackReserve: '10', presalePrice: '0.002', listingMultiplier: '10.4', priceLevelSupport: '0.06'}
// { tokenSupply: 1000, fundsToLP: '75', buybackReserve: '15', presalePrice: 1, listingMultiplier: 3, priceLevelSupport: 1.1 }
const presaleSettingsV1 = {
  totalTokenSupply: 1000,
  lpUsdFraction: 0.75,
  buybackFraction: 0.15,
  presalePrice: 1,
  listingMultiplier: 3,
  buybackPrice: 1.1 // e.g. bot buys slightly below presale price
};

// {
//   V_total_token: 1000,   # Total supply
//   PP:            1,      # Presale price
//   P_BB:          1.1,    # Buyback price
//   L:             3,      # Listing multiplier
//   # all f_* variables is part of "raised" volume
//   f_LP_usd:      0.75,   # Raised volume allocated to LP in base currency
//   f_BB:          0.15,   # Fraction of raised volume we allocate to the buyback
// }

const resultV1 = ProfitChance.calculate(presaleSettingsV1);
console.log(resultV1);
console.log(`Profitable user share: ${(resultV1.profitableUserShare * 100).toFixed(2)}%`);



// 1 000 000 саплай токенів
// пресейл ціна 0.1 солана
// зібрали 13000 солан
// в ліквідність йде 40%
// на відкуп 40%
// команді решту %
// ціна відкупу 1.01х
// L = 3
// який буде % профіту
const presaleSettingsV2 = {
  totalTokenSupply: 1000000, // 1 000 000 саплай токенів
  lpUsdFraction: 0.40, // в ліквідність йде 40%
  buybackFraction: 0.40,//  на відкуп 40%
  presalePrice: 0.1, // пресейл ціна 0.1 солана
  listingMultiplier: 3,
  buybackPrice: 1.01 // ціна відкупу 1.01х
};

const resultV2 = ProfitChance.calculate(presaleSettingsV2);
console.log(resultV2);
console.log(`Profitable user share V2: ${(resultV2.profitableUserShare * 100).toFixed(2)}%`);



// 1 000 000 саплай токенів
// ціна 0.01сол
// зібрали 2000 солан
// 30% ліква
// відкуп 60%
// Команді решту
// Ціна відкупу 1.1х
// L = 3
// який буде % профіту
const presaleSettingsV3 = {
  totalTokenSupply: 1000000,
  lpUsdFraction: 0.30,
  buybackFraction: 0.60,
  presalePrice: 0.01,
  listingMultiplier: 3,
  buybackPrice: 1.1 // e.g. bot buys slightly below presale price
};

const resultV3 = ProfitChance.calculate(presaleSettingsV3);
console.log(resultV3);
console.log(`Profitable user share V2: ${(resultV3.profitableUserShare * 100).toFixed(2)}%`);

