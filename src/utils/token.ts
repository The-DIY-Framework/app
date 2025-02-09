import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

export const DIY_TOKEN_ADDRESS = 'BBHhhPZTT57ZTxNPkXERSn1JXGe8gSyzqpX8Ej2mpump';
export const REQUIRED_AMOUNT = 5_000_000;

export async function checkTokenBalance(connection: Connection, publicKey: PublicKey): Promise<boolean> {
  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      { programId: TOKEN_PROGRAM_ID }
    );

    const diyAccount = tokenAccounts.value.find(
      account => account.account.data.parsed.info.mint === DIY_TOKEN_ADDRESS
    );

    if (!diyAccount) {
      return false;
    }

    const balance = Number(diyAccount.account.data.parsed.info.tokenAmount.amount);
    return balance >= REQUIRED_AMOUNT;
  } catch (error) {
    console.error('Error checking token balance:', error);
    return false;
  }
}