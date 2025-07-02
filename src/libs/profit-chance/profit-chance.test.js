import { ProfitChance } from './profit-chance.js'


const presaleSettings = {
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

const result = ProfitChance.calculate(presaleSettings);

console.log(result);

console.log(`Profitable user share: ${(result.profitableUserShare * 100).toFixed(2)}%`);
