"use client";

import { useWallet } from "@lazorkit/wallet";
import { Check, Copy, History } from "lucide-react";

import Link from "next/link";
import { useState } from "react";
import { getChats } from "@/lib/chatHistory";
import { useRouter } from "next/navigation";

const Header = () => {
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { connect, disconnect, isConnected, isConnecting, wallet } =
    useWallet();
  const router = useRouter();

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

  const chats = getChats();

  return (
    <>
      <header className="flex py-5 font-stretch-semi-expanded justify-between items-center border-b-2">
        <div className="flex items-center gap-4">
          <Link href="/">
            <h1 className="uppercase">slo chat</h1>
          </Link>
          <button
            onClick={() => setShowHistory(true)}
            className="cursor-pointer hover:text-pink-600"
          >
            <History className="w-5 h-5" />
          </button>
        </div>
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
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Chat History</h2>
            {chats.length === 0 ? (
              <p>No chats yet.</p>
            ) : (
              <ul>
                {chats.map((chat) => (
                  <li key={chat.chatContext}>
                    <button
                      onClick={() => {
                        setShowHistory(false);
                        router.push(`/chat/${chat.chatContext}`);
                      }}
                      className="w-full text-left p-2 hover:bg-gray-100 rounded"
                    >
                      {chat.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => setShowHistory(false)}
              className="mt-4 px-4 py-2 bg-gray-500 text-white rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
