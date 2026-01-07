"use client";

import { getInitializeInstruction } from "@/program-helpers";
import Chat from "./components/chat";
import Header from "./components/header";
import { useWalletStore } from "@lazorkit/wallet";
import { address, createNoopSigner } from "@solana/kit";
import { getChatContext } from "@/lib/llm-accounts";

export default function Home() {
  const { wallet } = useWalletStore();

  const seed = (() => {
    const raw = localStorage.getItem("seed");
    const next = raw === null ? 0 : Number(raw) + 1;
    localStorage.setItem("seed", String(next));
    return next;
  })();

  const handleChatStart = async () => {
    if (wallet) {
      const walletAddress = address(wallet?.smartWallet as string);
      const transactionSigner = createNoopSigner(walletAddress);
      const chatContext = await getChatContext(wallet.smartWallet, seed);

      const createChatInstruction = getInitializeInstruction({
        seed,
        user: transactionSigner,
        chatContext,
      });

      console.log(createChatInstruction);
    }
  };

  return (
    <main className="px-10 ">
      <Header />
      <div className="flex bg-[url('/bg2.png')] bg-cover bg-no-repeat min-h-[90vh] w-full flex-col items-center justify-center">
        <Chat handleChat={handleChatStart} />
      </div>
    </main>
  );
}
