export class ProfitChance {

  static calculate({
    totalTokenSupply,   // Total token supply
    lpUsdFraction,      // Fraction of raised funds allocated to LP in USD
    buybackFraction,    // Fraction of raised funds allocated to buyback
    presalePrice,       // Token price during presale
    listingMultiplier,  // Price multiplier for listing (L)
    buybackPrice        // Price at which the buyback bot buys tokens (P_BB)
  }) {
    // Fraction of tokens sold in presale
    const presaleFraction = listingMultiplier / (listingMultiplier + lpUsdFraction);

    // Tokens sold in presale
    const tokensSoldInPresale = totalTokenSupply * presaleFraction;

    // USD raised from presale
    const usdRaised = tokensSoldInPresale * presalePrice;

    // Tokens added to LP
    const tokensInLp = totalTokenSupply * (1 - presaleFraction);

    // USD in LP (using listing price)
    const usdInLp = tokensInLp * presalePrice * listingMultiplier;

    // Max tokens users can sell before price drops to presale level
    const maxTokensBeforePriceDrop = Math.sqrt((tokensInLp * usdInLp) / presalePrice) - tokensInLp;

    // USD available for buyback
    const buybackUsd = usdRaised * buybackFraction;

    // Tokens the buyback bot can repurchase at the specified buyback price
    const tokensBoughtByBuyback = buybackUsd / buybackPrice;

    // Total tokens users can sell without causing loss
    const totalProfitableTokens = maxTokensBeforePriceDrop + tokensBoughtByBuyback;

    // Share of presale users who can sell at break-even or profit
    const profitableUserShare = totalProfitableTokens / tokensSoldInPresale;

    return {
      presaleFraction,
      tokensSoldInPresale,
      usdRaised,
      tokensInLp,
      usdInLp,
      maxTokensBeforePriceDrop,
      buybackUsd,
      tokensBoughtByBuyback,
      totalProfitableTokens,
      profitableUserShare
    };
  }
}