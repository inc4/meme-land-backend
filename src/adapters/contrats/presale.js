import * as anchor from "@coral-xyz/anchor";
import * as borsh from '@coral-xyz/borsh'
import Decimal from 'decimal.js';
import { BN } from "bn.js";

import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { networkStateAccountAddress, Orao, randomnessAccountAddress } from "@orao-network/solana-vrf";

import idl from "./mem_land.json" assert { type: 'json' };

// Token Metadata Program ID
const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

const SOL_DECIMALS = 9;

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
  async addUser(walletAddress) {
    const userKey = new PublicKey(walletAddress);
    const [operatorRolePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("role"), this.#payer.publicKey.toBuffer()],
      this.#program.programId
    );
    const [userRolePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("role"), userKey.toBuffer()],
      this.#program.programId
    );

    await this.#program.methods
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
      try {
        tokeAccounts = await this.#getToken(pdas, tokeData.receiver);
      } catch { };

    } while (!tokeAccounts)

    await this.#mintTokens(tokeData, pdas, tokeAccounts.userTokenAccount);
    return { mintPda: pdas.mintPda };
  }

  async #getToken(pdas, receiver) {
    const { userTokenAccount, treasureTokenAccount } = await this.#getTokenAccounts(
      pdas.mintPda,
      new anchor.web3.PublicKey(receiver),
      pdas.treasurePda
    );
    return { userTokenAccount, treasureTokenAccount };
  }

  // mintPda: PublicKey, userPubkey: PublicKey, treasurePda: PublicKey
  async #getTokenAccounts(mintPda, userPubkey, treasurePda) {
    const userTokenAccount = await getAssociatedTokenAddress(
      mintPda,
      userPubkey,
      true,
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
        uri: uri
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

  // name: string, symbol: string, amount: number, receiver: string
  async #mintTokens({ name, symbol, amount, receiver }, pdas, userTokenAccount) {
    await this.#program.methods
      .mintToken({
        name,
        symbol,
        mintAmount: new BN(amount).mul(new BN(10).pow(new BN(9))),
      })
      .accounts({
        payer: this.#payer.publicKey,
        receiver: new anchor.web3.PublicKey(receiver),
        mintAccount: pdas.mintPda,
        adminRoleAccount: pdas.roleAccountPda,
        authorityPda: pdas.authorityPda,
        tokenAccount: userTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([this.#payer])
      .rpc();
  }

  //  campaignData: {
  //    tokenName : string;
  //    tokenSymbol: string;
  //    step: number; // in ms
  //    price: number; 
  //    minAmount: number;
  //    maxAmount: number; 
  //    tokenSupply: number; 
  //    listingPrice: number;
  //    numberOfWallets: number;
  //    solTreasury: PublicKey;
  // }
  async createCampaign(campaignData) {
    const pdas = PresaleContractAdapter.getPdas(campaignData.tokenName, campaignData.tokenSymbol, this.#program.programId, this.#payer.publicKey);
    const tx = await this.#program.methods
      .createCampaign({
        tokenName: campaignData.tokenName,
        tokenSymbol: campaignData.tokenSymbol,
        step: new BN(campaignData.step),
        price: PresaleContractAdapter.parseAmountToBN(campaignData.price, SOL_DECIMALS),// convert to lamports
        minAmount: PresaleContractAdapter.parseAmountToBN(campaignData.minAmount, SOL_DECIMALS),// convert to lamports
        maxAmount: PresaleContractAdapter.parseAmountToBN(campaignData.maxAmount, SOL_DECIMALS),// convert to lamports
        tokenSupply: new BN(campaignData.tokenSupply).mul(new BN(10).pow(new BN(9))),// convert with decimals
        listingPrice: PresaleContractAdapter.parseAmountToBN(campaignData.listingPrice, SOL_DECIMALS),// convert to lamports
        numberOfWallets: new BN(campaignData.numberOfWallets),
        solTreasury: new anchor.web3.PublicKey(campaignData.solTreasury),
      })
      .accounts({
        payer: this.#payer.publicKey,
        roleAccount: pdas.roleAccountPda,
        mintAccount: pdas.mintPda,
        vaultTokenAccount: pdas.vaultTokenAccountPda,
        campaign: pdas.campaignPda,
        campaignStats: pdas.campaignStatsPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([this.#payer])
      .rpc();

    let campaignInfo = null;
    do {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      try {
        campaignInfo = await this.#getCampaignInfo(pdas);
      } catch { };

    } while (!campaignInfo)

    return {
      campaignPda: pdas.campaignPda,
      campaignStatsPda: pdas.campaignStatsPda,
      tokenAccount: campaignInfo.tokenAccount
    };
  }

  async #getCampaignInfo(pdas) {
    return await this.#program.account.campaign.fetch(pdas.campaignPda);
  }

  async setCampaignStatus(tokenName, tokenSymbol, status, timestamp) {
    const pdas = PresaleContractAdapter.getPdas(tokenName, tokenSymbol, this.#program.programId);
    let statusObj;
    if (status === 'distributionOpened' && timestamp) {
      statusObj = { distributionOpened: new anchor.BN(timestamp) };
    } else {
      statusObj = { [status]: {} };
    }
    await this.#program.methods
      .setStatus({
        tokenName,
        tokenSymbol,
        status: statusObj,
      })
      .accounts({
        campaign: pdas.campaignPda,
        mintAccount: pdas.mintPda,
      })
      .rpc();
  }

  readParticipationLogs(callback) {
    const discriminator = idl.events.find((e) => e.name === 'ParticipateEvent').discriminator;
    const discriminatorBuffer = Buffer.from(discriminator);

    this.#program.provider.connection.onLogs(
      this.#program.programId,
      (logs, ctx) => {
        const programDataLine = logs.logs.find(line => line.startsWith("Program data: "));
        if (!programDataLine) return;

        const base64Payload = programDataLine.replace("Program data: ", "")
        const eventBuffer = Buffer.from(base64Payload, 'base64');

        const prefix = eventBuffer.subarray(0, 8);
        if (!prefix.equals(discriminatorBuffer)) return;

        const eventDataBuffer = eventBuffer.subarray(8);

        const ParticipateEventLayout = borsh.struct([
          borsh.str('token_name'),
          borsh.str('token_symbol'),
          borsh.u64('sol_amount'),
          borsh.u64('token_amount'),
          borsh.publicKey('mint_account'),
          borsh.publicKey('campaign'),
          borsh.publicKey('participant_pubkey')
        ]);

        const event = ParticipateEventLayout.decode(eventDataBuffer);

        return callback({
          tokenName: event.token_name,
          tokenSymbol: event.token_symbol,
          solAmount: new Decimal(event.sol_amount.toString()).div('1e9'),
          tokenAmount: new Decimal(event.token_amount.toString()).div('1e9'),
          mintAccount: event.mint_account.toBase58(),
          participationAccount: event.participant_pubkey.toBase58(),
          campaign: event.campaign.toBase58()
        });
      },
      "confirmed"
    );
  }


  async calculateDistribution(tokenName, tokenSymbol) {
    const pdas = PresaleContractAdapter.getPdas(tokenName, tokenSymbol, this.#program.programId, this.#payer.publicKey);
    const random = randomnessAccountAddress(pdas.campaignPda.toBuffer());
    const config = networkStateAccountAddress();
    const configData = await this.#vrf.account.networkState.fetch(config);
    const treasury = configData.config.treasury;

    await this.#program.methods
      .calculateDistribution({
        tokenName: tokenName,
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

    const [vaultTokenAccountPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), mintPda.toBuffer()],
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
      vaultTokenAccountPda,
      roleAccountPda,
    };
  }

  /**
   * @param amountStr string
   * @param decimals number
   * @returns BN
   */
  static parseAmountToBN(amountStr, decimals) {
    const [whole, fraction = ""] = amountStr.split(".");
    const normalizedFraction = (fraction + "0".repeat(decimals)).slice(0, decimals);
    const rawStr = whole + normalizedFraction;

    if (!/^\d+$/.test(rawStr)) {
      throw new Error(`Invalid amount: ${amountStr}`);
    }

    return new BN(rawStr);
  }
}

