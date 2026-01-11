"use client";

import { useWallet } from "@lazorkit/wallet";
import { Check, Copy, History } from "lucide-react";

import Link from "next/link";
import { useState } from "react";
import { getChats } from "@/lib/chatHistory";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      <header className="flex py-5 font-stretch-semi-expanded font-mono justify-between items-center border-b-2">
        <Link href="/">
          <div className="flex items-center gap-2">
            <h1>slochat</h1>
            <span className="text-xs px-2 py-0.5 rounded-full border border-pink-600 text-pink-600">
              devnet
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowHistory(true)}
            className="cursor-pointer opacity-80 hover:text-pink-600"
          >
            <History className="w-4.5 h-4.5" />
          </button>
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
        </div>
      </header>
      {showHistory && (
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Chat History</DialogTitle>
            </DialogHeader>

            {chats.length === 0 ? (
              <p className="text-sm text-muted-foreground">No chats yet.</p>
            ) : (
              <ScrollArea className="h-72 pr-2">
                <div className="space-y-1">
                  {chats.map((chat) => (
                    <Button
                      key={chat.chatContext}
                      variant="ghost"
                      className="w-full justify-start text-left"
                      onClick={() => {
                        setShowHistory(false);
                        router.push(`/chat/${chat.chatContext}`);
                      }}
                    >
                      {chat.title}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setShowHistory(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default Header;
