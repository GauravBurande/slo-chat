"use client";

import { useWallet } from "@lazorkit/wallet";
import { Check, Copy } from "lucide-react";

import Link from "next/link";
import { useState } from "react";

const Header = () => {
  const [copied, setCopied] = useState(false);

  const { connect, disconnect, isConnected, isConnecting, wallet } =
    useWallet();

  const handleCopy = async () => {
    try {
      if (!wallet) {
        alert("Failed to copy address, Sign in again!");
      }
      await navigator.clipboard.writeText(wallet?.smartWallet as string);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch (err) {
      console.error(err);
    }
  };
  return (
    <header className="flex py-5 font-stretch-semi-expanded justify-between items-center border-b-2">
      <Link href="/">
        <h1 className="uppercase">bidloyal</h1>
      </Link>
      <div className="cursor-pointer">
        {isConnected && wallet ? (
          <div className="flex items-center gap-2">
            <button
              className="cursor-pointer hover:text-pink-600"
              onClick={() => disconnect()}
            >
              Disconnect ({wallet.smartWallet.slice(0, 6)}...)
            </button>
            <button className="cursor-pointer">
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy
                  onClick={handleCopy}
                  className="w-4 h-4 hover:text-pink-600"
                />
              )}
            </button>
          </div>
        ) : (
          <button
            className="cursor-pointer"
            onClick={() => connect()}
            disabled={isConnecting}
          >
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
