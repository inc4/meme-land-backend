import Decimal from "decimal.js";

export class ProfitChance {

  static calculate({
    totalTokenSupply,   // Total token supply
    lpUsdFraction,      // Fraction of raised funds allocated to LP in USD
    buybackFraction,    // Fraction of raised funds allocated to buyback
    presalePrice,       // Token price during presale
    listingMultiplier,  // Price multiplier for listing (L)
    buybackPrice        // Price at which the buyback bot buys tokens (P_BB)
  }) {
    // Convert all inputs to Decimal for precision
    const totalToken = new Decimal(totalTokenSupply);
    const fLP = new Decimal(lpUsdFraction);
    const fBB = new Decimal(buybackFraction);
    const PP = new Decimal(presalePrice);
    const L = new Decimal(listingMultiplier);
    const PBB = new Decimal(buybackPrice);

    // Fraction of tokens sold in presale
    const fRaise = L.div(L.plus(fLP));

    // Tokens sold in presale
    const tokensSoldInPresale = totalToken.mul(fRaise);

    // USD raised from presale
    const usdRaised = tokensSoldInPresale.mul(PP);

    // Tokens added to LP
    const tokensInLp = totalToken.mul(Decimal.sub(1, fRaise));

    // USD in LP (using listing price)
    const usdInLp = tokensInLp.mul(PP).mul(L);

    // Max tokens users can sell before price drops to presale level
    const maxTokensBeforePriceDrop = tokensInLp
      .mul(usdInLp)
      .div(PP)
      .sqrt()
      .minus(tokensInLp);

    // USD available for buyback
    const buybackUsd = usdRaised.mul(fBB);

    // Tokens the buyback bot can repurchase at the specified buyback price
    const tokensBoughtByBuyback = buybackUsd.div(PBB);

    // Total tokens users can sell without causing loss
    const totalProfitableTokens = maxTokensBeforePriceDrop.plus(tokensBoughtByBuyback);

    // Share of presale users who can sell at break-even or profit
    const profitableUserShare = totalProfitableTokens.div(tokensSoldInPresale);

    return {
      presaleFraction: fRaise.toNumber(),
      tokensSoldInPresale: tokensSoldInPresale.toNumber(),
      usdRaised: usdRaised.toNumber(),
      tokensInLp: tokensInLp.toNumber(),
      usdInLp: usdInLp.toNumber(),
      maxTokensBeforePriceDrop: maxTokensBeforePriceDrop.toNumber(),
      buybackUsd: buybackUsd.toNumber(),
      tokensBoughtByBuyback: tokensBoughtByBuyback.toNumber(),
      totalProfitableTokens: totalProfitableTokens.toNumber(),
      profitableUserShare: profitableUserShare.toNumber()
    };
  }
}