import { Connection, Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';

// Helper type that allows passing either a Keypair or an object with publicKey
export type WalletLike = Keypair | { publicKey: PublicKey };

export interface BuildTransactionParams {
  connection: Connection;
  market: string;
  direction: string;
  wallet: WalletLike;
  mint: PublicKey;
  poolAddress?: PublicKey;
  amount: number;
  slippage: number; // 0..1
  priorityFeeSol?: number; // default 0.0001
  additionalInstructions?: TransactionInstruction[];
}


