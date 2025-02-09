import { FC, ReactNode, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { isWhitelisted } from '@/utils/whitelist';

import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
  children: ReactNode;
}

const DIY_TOKEN_ADDRESS = 'BBHhhPZTT57ZTxNPkXERSn1JXGe8gSyzqpX8Ej2mpump';
const REQUIRED_AMOUNT = 5_000_000;

export const TokenGuard: FC<Props> = ({ children }) => {
  const { connection } = useConnection();
  const { publicKey, connected, disconnecting, connecting } = useWallet();
  const [hasEnoughTokens, setHasEnoughTokens] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [previousWallet, setPreviousWallet] = useState<string | null>(null);
  const [isWalletWhitelisted, setIsWalletWhitelisted] = useState(false);

  useEffect(() => {
    // Check if wallet has changed
    if (publicKey?.toBase58() !== previousWallet) {
      setIsLoading(true);
      setHasEnoughTokens(false);
      setIsWalletWhitelisted(false);
      setPreviousWallet(publicKey?.toBase58() || null);
    }

    const checkAccess = async () => {
      if (!publicKey || !connected) {
        setHasEnoughTokens(false);
        setIsWalletWhitelisted(false);
        setIsLoading(false);
        return;
      }

      // Check whitelist first
      const walletAddress = publicKey.toBase58();
      const whitelisted = isWhitelisted(walletAddress);
      setIsWalletWhitelisted(whitelisted);

      // If whitelisted, no need to check token balance
      if (whitelisted) {
        setHasEnoughTokens(true);
        setIsLoading(false);
        return;
      }

      try {
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: TOKEN_PROGRAM_ID }
        );

        const diyAccount = tokenAccounts.value.find(
          account => account.account.data.parsed.info.mint === DIY_TOKEN_ADDRESS
        );

        if (!diyAccount) {
          setHasEnoughTokens(false);
          setIsLoading(false);
          return;
        }

        const balance = Number(diyAccount.account.data.parsed.info.tokenAmount.amount);
        setHasEnoughTokens(balance >= REQUIRED_AMOUNT);
      } catch (error) {
        console.error('Error checking token balance:', error);
        setHasEnoughTokens(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [connection, publicKey, connected]);

  // Show connect wallet prompt when not connected or disconnecting
  if (!connected || disconnecting) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <h1 className="text-2xl font-bold mb-6">Connect Your Wallet</h1>
          <p className="text-gray-600 mb-6">
            {disconnecting 
              ? "Wallet disconnected. Please reconnect to continue."
              : "Please connect your wallet to create an agent. You need at least 5M DIY tokens to proceed unless your wallet is whitelisted."}
          </p>
          <div className="wallet-adapter-button-trigger">
  <WalletMultiButton className="!bg-black hover:!bg-gray-800" />
</div>
        </div>
      </div>
    );
  }

  // Show loading state when checking balance or connecting
  if (isLoading || connecting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {connecting ? "Connecting wallet..." : "Checking wallet status..."}
          </p>
        </div>
      </div>
    );
  }

  // Show insufficient balance message if not whitelisted and doesn't have enough tokens
  if (!isWalletWhitelisted && !hasEnoughTokens) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm text-center max-w-md">
          <h1 className="text-2xl font-bold mb-6">Access Restricted</h1>
          <p className="text-gray-600 mb-4">
            Your wallet is not whitelisted and does not have the required 5M DIY tokens.
          </p>
          <div className="space-y-4">
            <a 
              href="https://dexscreener.com/solana/cfgakmpfzaacx5es1mpz2vqb2hgxubqhe9kq3jn5rfrf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 block"
            >
              Get DIY tokens →
            </a>
            <div className="pt-2 border-t">
              <p className="text-sm text-gray-500 mb-2">Want to try a different wallet?</p>
              <div className="wallet-adapter-button-trigger">
  <WalletMultiButton className="!bg-black hover:!bg-gray-800" />
</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};