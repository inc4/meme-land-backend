import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { networkStateAccountAddress, Orao, randomnessAccountAddress } from "@orao-network/solana-vrf";

import idl from "./mem_land.json" assert { type: 'json' };

export class PresaleContractAdapter {
  #payer;
  #program;
  #vrf;

  constructor() {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    this.#payer = provider.wallet.payer;
    this.#program = new anchor.Program(idl, provider);
    this.#vrf = new Orao(provider);
  }

  get payer() {
    return this.#payer;
  }


  // wallet == userPubkey ???
  async addUser(userPubkey) {
    const userKey = new PublicKey(userPubkey);
    const [operatorRolePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("role"), this.#payer.publicKey.toBuffer()],
      this.#program.programId
    );
    const [userRolePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("role"), userKey.toBuffer()],
      this.#program.programId
    );

    await program.methods
      .assignVerifiedUser(userKey)
      .accounts({
        assigner: this.#payer.publicKey,
        assignerRoleAccount: operatorRolePda,
        userRoleAccount: userRolePda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([this.#payer])
      .rpc();
  }

  // tokeData = {name: string, symbol: string, uri: string, amount: number, receiver: PublicKey}
  async createToken(tokeData) {
    const pdas = await this.#createTokenEntity(tokeData);

    let tokeAccounts = null;
    do {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      tokeAccounts = await this.#getToken(pdas);
    } while (!tokeAccounts)

    await this.#mintTokens(tokeData, pdas, tokeAccounts.userTokenAccount);
    return { mintPda };
  }

  async #getToken(pdas) {
    const { userTokenAccount, treasureTokenAccount } = await this.#getTokenAccounts(
      pdas.mintPda,
      this.#payer.publicKey,
      pdas.treasurePda
    );
    return { userTokenAccount, treasureTokenAccount };
  }

  // mintPda: PublicKey, userPubkey: PublicKey, treasurePda: PublicKey
  async #getTokenAccounts(mintPda, userPubkey, treasurePda) {
    const userTokenAccount = await getAssociatedTokenAddress(
      mintPda,
      userPubkey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const treasureTokenAccount = await getAssociatedTokenAddress(
      mintPda,
      treasurePda,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    return { userTokenAccount, treasureTokenAccount };
  }

  async #createTokenEntity({ name, symbol, uri }) {
    const pdas = PresaleContractAdapter.getPdas(name, symbol, this.#program.programId, this.#payer.publicKey);

    const [metadataPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        pdas.mintPda.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const tx = await this.#program.methods
      .createToken({
        name,
        symbol,
        uri: uri || "https://example.com/token-metadata.json",
      })
      .accounts({
        payer: this.#payer.publicKey,
        mintAccount: pdas.mintPda,
        adminRoleAccount: pdas.roleAccountPda,
        authorityPda: pdas.authorityPda,
        metadataAccount: metadataPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([this.#payer])
      .rpc();
    return pdas;
  }

  // name: string, symbol: string, amount: number, receiver: PublicKey
  async #mintTokens({ name, symbol, amount, receiver }, pdas, userTokenAccount) {
    await this.#program.methods
      .mintToken({
        name,
        symbol,
        mintAmount: new anchor.BN(amount).mul(Math.pow(10, 9)),
      })
      .accounts({
        payer: this.#payer.publicKey,
        receiver,
        mintAccount: pdas.mintPda,
        adminRoleAccount: pdas.roleAccountPda,
        authorityPda: pdas.authorityPda,
        tokenAccount: userTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([payer])
      .rpc();
  }

  //  campaignData: {
  //    tokenName : string;
  //    tokenSymbol: string;
  //    step: number; // in ms
  //    price: number; // in lamports
  //    minAmount: number; // in lamports
  //    maxAmount: number; // in lamports
  //    tokenSupply: number; // in tokens with decimals
  //    listingPrice: number; // in lamports
  //    numberOfWallets: number;
  //    solTreasury: PublicKey;
  // }
  async createCampaign(campaignData) {
    const pdas = PresaleContractAdapter.getPdas(campaignData.tokenName, campaignData.tokenSymbol, this.#program.programId, this.#payer.publicKey);
    const tx = await this.#program.methods
      .createCampaign({
        tokenName: campaignData.tokenName,
        tokenSymbol: campaignData.tokenSymbol,
        step: new anchor.BN(campaignData.step),
        price: new anchor.BN(campaignData.price).mul(Math.pow(10, 9)),
        minAmount: new anchor.BN(campaignData.minAmount).mul(Math.pow(10, 9)),
        maxAmount: new anchor.BN(campaignData.maxAmount).mul(Math.pow(10, 9)),
        tokenSupply: new anchor.BN(campaignData.tokenSupply).mul(Math.pow(10, 9)),
        listingPrice: new anchor.BN(campaignData.listingPrice).mul(Math.pow(10, 9)),
        numberOfWallets: new anchor.BN(campaignData.numberOfWallets),
        solTreasury: campaignData.solTreasury,
      })
      .accounts({
        payer: this.#payer.publicKey,
        roleAccount: pdas.roleAccountPda,
        mintAccount: pdas.mintPda,
        campaign: pdas.campaignPda,
        campaignStats: pdas.campaignStatsPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([this.#payer])
      .rpc();
    return { campaignPda: pdas.campaignPda, campaignStatsPda: pdas.campaignStatsPda };
  }

  async setCampaignStatus(tokenName, tokenSymbol, status) {
    const pdas = PresaleContractAdapter.getPdas(tokenName, tokenSymbol, this.#program.programId);
    await this.#program.methods
      .setStatus({
        tokenName,
        tokenSymbol,
        status: { [status]: {} },
      })
      .accounts({
        campaign: pdas.campaignPda,
        mintAccount: pdas.mintPda,
      })
      .rpc();
  }

  addEventListener(...params) {
    this.#program.addEventListener(...params);
  }

  async calculateDistribution(tokeName, tokenSymbol) {
    const pdas = getPdas(tokeName, tokenSymbol, this.#program.programId, this.#payer.publicKey);

    // FIXME: is it necessary row of code???
    const campaignData = await this.#program.account.campaign.fetch(pdas.campaignPda);

    const random = randomnessAccountAddress(pdas.campaignPda.toBuffer());
    const config = networkStateAccountAddress();
    const configData = await this.#vrf.account.networkState.fetch(config);
    const treasury = configData.config.treasury;

    await this.#program.methods
      .calculateDistribution({
        tokenName: tokeName,
        tokenSymbol: tokenSymbol,
      })
      .accounts({
        signer: this.#payer.publicKey,
        roleAccount: pdas.roleAccountPda,
        campaign: pdas.campaignPda,
        mintAccount: pdas.mintPda,
        random: random,
        treasury: treasury,
        config: config,
        vrf: this.#vrf.programId,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([this.#payer])
      .rpc();
  }

  static getPdas(tokenName, tokenSymbol, programId, userPubkey) {
    const [mintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), Buffer.from(tokenName), Buffer.from(tokenSymbol)],
      programId
    );

    const [campaignPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("campaign"), mintPda.toBuffer()],
      programId
    );

    const [campaignStatsPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("stats"), mintPda.toBuffer()],
      programId
    );

    const [treasurePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasure"), mintPda.toBuffer()],
      programId
    );

    const [authorityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("authority"), mintPda.toBuffer()],
      programId
    );

    let roleAccountPda;
    if (userPubkey) {
      [roleAccountPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("role"), userPubkey.toBuffer()],
        programId
      );
    }

    return {
      mintPda,
      campaignPda,
      campaignStatsPda,
      treasurePda,
      authorityPda,
      roleAccountPda
    };
  }
}