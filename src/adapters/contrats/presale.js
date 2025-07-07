import * as anchor from "@coral-xyz/anchor";
import Decimal from 'decimal.js';
import { BN } from "bn.js";
import { sha256 } from "js-sha256";
import { PublicKey } from "@solana/web3.js";
import retry from 'async-retry';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { networkStateAccountAddress, Orao, randomnessAccountAddress } from "@orao-network/solana-vrf";

import idl from "./mem_land.json" with { type: 'json' };

// Token Metadata Program ID
const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

const SOL_DECIMALS = 9;
const RPC_CALL_RETRY = 5;
const RPC_CALL_MIN_INTERVAL = 1000;
const SLOT_BATCH_SIZE = 100;
const PARTICIPATION_BATCH_SIZE = 500;

export class PresaleContractAdapter {
  #logger;
  #payer;
  #program;
  #parser;
  #vrf;
  #eventHandlers;
  #castEventResult;

  constructor(logger, anchorOptions) {
    this.#logger = logger;


    const connection = new anchor.web3.Connection(anchorOptions.providerUrl, 'finalized');

    const wallet = anchor.Wallet.local();
    const provider = new anchor.AnchorProvider(connection, wallet, {
      preflightCommitment: anchorOptions.commitmentLevel || 'finalized',
      commitment: anchorOptions.commitmentLevel || 'finalized',
    });

    anchor.setProvider(provider);

    this.#payer = provider.wallet.payer;
    this.#program = new anchor.Program(idl, provider);
    this.#parser = new anchor.EventParser(this.#program.programId, this.#program.coder);
    this.#vrf = new Orao(provider);
    this.#eventHandlers = {};
    this.#castEventResult = {
      calculateDistributionEvent: this.#castCalculateDistributionEvent.bind(this),
      participateEvent: this.#castParticipateEvent.bind(this),
      setStatusEvent: this.#castSetStatusEvent.bind(this),
    };

    this.#handleEvents();
  }

  async recoverParticipationFromSignatures(startSlot, callback) {
    const connection = this.#program.provider.connection;

    const RATE_LIMIT = 10;
    const DELAY_MS = 1000 / RATE_LIMIT;

    let before = undefined;
    let count = 0;
    let batch = [];

    while (true) {
      const signatures = await connection.getSignaturesForAddress(this.#program.programId, {
        limit: SLOT_BATCH_SIZE,
        before,
        commitment: 'finalized'
      });

      if (!signatures.length) break;

      for (const sigInfo of signatures) {
        if (sigInfo.slot < startSlot) {
          if (batch.length) await callback(batch);
          this.#logger.info(`✅ Replayed total ${count} participation events`);
          return;
        }

        await new Promise((res) => setTimeout(res, DELAY_MS)); // ⏳ rate limit

        const tx = await connection.getParsedTransaction(sigInfo.signature, {
          commitment: 'finalized',
        });
        console.log('🚀 - PresaleContractAdapter - recoverParticipationFromSignatures - tx:', tx)

        if (!tx?.meta?.logMessages) continue;

        const parsedEvents = this.#parser.parseLogs(tx.meta.logMessages);

        for (const event of parsedEvents) {
          if (event.name === 'participateEvent') {
            event.data.lastProcessedSlot = sigInfo.slot;
            batch.push(this.#castParticipateEvent(event.data));
            count++;

            if (batch.length >= PARTICIPATION_BATCH_SIZE) {
              await callback(batch);
              batch = [];
            }
          }
        }
      }

      before = signatures[signatures.length - 1].signature;
    }
    this.#logger.info(`✅ Replayed total ${count} participation events`);
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

    await retry(async (bail) => {
      try {
        return await this.#program.methods
          .assignVerifiedUser(userKey)
          .accounts({
            assigner: this.#payer.publicKey,
            assignerRoleAccount: operatorRolePda,
            userRoleAccount: userRolePda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([this.#payer])
          .rpc();
      } catch (err) {
        this.#logger.warn('Presale contract RPC assignVerifiedUser call fail. Retry...', err);
        throw err;
      }
    }, {
      retries: RPC_CALL_RETRY,
      minTimeout: RPC_CALL_MIN_INTERVAL,
    });

  }

  // tokeData = {name: string, symbol: string, uri: string, amount: number, receiver: PublicKey}
  async createToken(tokeData) {
    const pdas = await this.#createTokenEntity(tokeData);

    const tokeAccounts = await retry(async (bail) => {
      try {
        return await this.#getToken(pdas, tokeData.receiver);
      } catch (err) {
        this.#logger.warn('Presale contract RPC getToken call fail. Retry...', err);
        throw err;
      }
    }, {
      retries: RPC_CALL_RETRY,
      minTimeout: RPC_CALL_MIN_INTERVAL,
    });

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

    await retry(async (bail) => {
      try {
        return await this.#program.methods
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
      } catch (err) {
        this.#logger.warn('Presale contract RPC createToken call fail. Retry...', err);
        throw err;
      }
    }, {
      retries: RPC_CALL_RETRY,
      minTimeout: RPC_CALL_MIN_INTERVAL,
    });

    return pdas;
  }

  // name: string, symbol: string, amount: number, receiver: string
  async #mintTokens({ name, symbol, amount, receiver }, pdas, userTokenAccount) {
    await retry(async (bail) => {
      try {
        return await this.#program.methods
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
      } catch (err) {
        this.#logger.warn('Presale contract RPC mintToken call fail. Retry...', err);
        throw err;
      }
    }, {
      retries: RPC_CALL_RETRY,
      minTimeout: RPC_CALL_MIN_INTERVAL,
    });
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

    // Solana on-chain use sec as timestamp
    const step = new BN(Math.floor(campaignData.step / 1000));

    await retry(async (bail) => {
      try {
        return await this.#program.methods
          .createCampaign({
            tokenName: campaignData.tokenName,
            tokenSymbol: campaignData.tokenSymbol,
            step,
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
      } catch (err) {
        this.#logger.warn('Presale contract RPC createCampaign call fail. Retry...', err);
        throw err;
      }
    }, {
      retries: RPC_CALL_RETRY,
      minTimeout: RPC_CALL_MIN_INTERVAL,
    });

    const campaignInfo = await retry(async (bail) => {
      try {
        return await this.#getCampaignInfo(pdas);
      } catch (err) {
        this.#logger.warn('Presale contract RPC getCampaignInfo call fail. Retry...', err);
        throw err;
      }
    }, {
      retries: RPC_CALL_RETRY,
      minTimeout: RPC_CALL_MIN_INTERVAL,
    });

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

    // Solana on-chain use sec as timestamp
    const distributeAt = timestamp ? new BN(Math.floor(timestamp / 1000)) : null


    await retry(async (bail) => {
      try {
        return await this.#program.methods
          .setStatus({
            tokenName,
            tokenSymbol,
            status: { [status]: {} },
            distributeAt,
          })
          .accounts({
            campaign: pdas.campaignPda,
            mintAccount: pdas.mintPda,
          })
          .rpc();
      } catch (err) {
        this.#logger.warn('Presale contract RPC setStatus call fail. Retry...', err);
        throw err;
      }
    }, {
      retries: RPC_CALL_RETRY,
      minTimeout: RPC_CALL_MIN_INTERVAL,
    });
  }

  subscribe(eventName, callback) {
    if (!this.#castEventResult[eventName]) {
      throw new Error(`Event ${eventName} not supported!`);
    }

    if (!this.#eventHandlers[eventName]) {
      this.#eventHandlers[eventName] = [];
    }

    this.#eventHandlers[eventName].push(callback);
  }


  #handleEvents() {
    this.#program.provider.connection.onLogs(
      this.#program.programId,
      (logs, ctx) => {
        for (const event of this.#parser.parseLogs(logs.logs)) {
          if (this.#eventHandlers[event.name]) {
            this.#eventHandlers[event.name].forEach((callback) => {
              event.data.lastProcessedSlot = ctx.slot
              callback(
                this.#castEventResult[event.name](event.data)
              );
            });
          }
        }

      },
      "finalized"
    );
  }

  #castParticipateEvent(event) {
    return {
      tokenName: event.tokenName,
      tokenSymbol: event.tokenSymbol,
      solAmount: new Decimal(event.solAmount.toString()).div('1e9'),
      tokenAmount: new Decimal(event.tokenAmount.toString()).div('1e9'),
      mintAccount: event.mintAccount.toBase58(),
      participationAccount: event.participantPubkey.toBase58(),
      campaign: event.campaign.toBase58(),
      lastProcessedSlot: event.lastProcessedSlot
    };
  }

  #castSetStatusEvent(event) {
    return {
      tokenName: event.tokenName,
      tokenSymbol: event.tokenSymbol,
      status: Object.keys(event.status)[0],
    };
  }

  #castCalculateDistributionEvent(event) {
    return {
      tokenName: event.tokenName,
      tokenSymbol: event.tokenSymbol,
      mintAccount: event.mintAccount.toBase58(),
      campaign: event.campaign.toBase58()
    };
  }

  // name: string, symbol: string
  // returns Promise<{randomness,totalParticipants}>
  async getCampaignVRFDescriptor(name, symbol) {
    const pdas = PresaleContractAdapter.getPdas(name, symbol, this.#program.programId, this.#payer.publicKey);

    const campaignStatsData = await this.#program.account.campaignStats.fetch(
      pdas.campaignStatsPda
    );

    const totalParticipants = campaignStatsData.totalParticipants.toNumber();

    const seed = pdas.campaignPda.toBuffer();

    // Get fulfilled randomness using VRF waitFulfilled method
    const randomness = await retry(async (bail) => {
      try {
        return await this.#vrf.waitFulfilled(seed);
      } catch (err) {
        this.#logger.warn('Presale contract RPC vrf.waitFulfilled call fail. Retry...', err);
        throw err;
      }
    }, {
      retries: RPC_CALL_RETRY,
      minTimeout: RPC_CALL_MIN_INTERVAL,
    });

    return {
      randomness: randomness.randomness,
      totalParticipants,
    };

  }

  // (vrfRandomness: Uint8Array, walletAddress: string,totalParticipants: number)
  // returns number
  calculateUserGroup(vrfRandomness, walletAddress, totalParticipants) {
    const combinedData = new Uint8Array(
      Buffer.concat([Buffer.from(vrfRandomness), Buffer.from(new PublicKey(walletAddress).toBytes())])
    );

    const hashResult = sha256.array(combinedData);

    const first8Bytes = hashResult.slice(0, 8);
    const hashAsU64 = Buffer.from(first8Bytes).readBigUInt64BE(0);

    const usersPerGroup = 1;
    const groupCount = Math.max(Math.floor(totalParticipants / usersPerGroup), 1);

    return Number(hashAsU64 % BigInt(groupCount));
  }

  async calculateDistribution(tokenName, tokenSymbol) {
    const pdas = PresaleContractAdapter.getPdas(tokenName, tokenSymbol, this.#program.programId, this.#payer.publicKey);
    const random = randomnessAccountAddress(pdas.campaignPda.toBuffer());
    const config = networkStateAccountAddress();
    const configData = await this.#vrf.account.networkState.fetch(config);
    const treasury = configData.config.treasury;

    await retry(async (bail) => {
      try {
        return await this.#program.methods
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
      } catch (err) {
        this.#logger.warn('Presale contract RPC calculateDistribution call fail. Retry...', err);
        throw err;
      }
    }, {
      retries: RPC_CALL_RETRY,
      minTimeout: RPC_CALL_MIN_INTERVAL,
    });
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

