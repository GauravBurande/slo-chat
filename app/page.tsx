"use client";

import { getCreateChatInstructionAsync } from "@/program-client/src";
import Chat from "./components/chat";
import Header from "./components/header";
import { usePrompt } from "./context/prompt-context";
import { useWalletStore } from "@lazorkit/wallet";
import { address, createNoopSigner } from "@solana/kit";

export default function Home() {
  const { prompt } = usePrompt();
  const { wallet } = useWalletStore();

  const seed = 0; // dynamic based on chats saved in localhost, max 255 as u8;

  const handleChatStart = async () => {
    if (wallet) {
      const walletAddress = address(wallet?.smartWallet as string);
      const transactionSigner = createNoopSigner(walletAddress);

      const createChatInstruction = await getCreateChatInstructionAsync({
        seed,
        text: prompt,
        user: transactionSigner,
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
