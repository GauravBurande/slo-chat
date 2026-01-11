"use client";

import { useState } from "react";
import { getInitializeInstruction } from "@/program-helpers";
import Chat from "./components/chat";
import Header from "./components/header";

import { PublicKey, useWalletStore } from "@lazorkit/wallet";
import {
  address,
  createNoopSigner,
  getProgramDerivedAddress,
  getAddressEncoder,
} from "@solana/kit";

import { getChatContext } from "@/lib/llm-accounts";
import { useRouter } from "next/navigation";
import { usePrompt } from "@/context/prompt-context";
import { saveChat } from "@/lib/chatHistory";
import { CHAT_AGENT_PROGRAM_ADDRESS } from "@/program-helpers/programs";
import { useUnprocessedChat } from "@/lib/hooks";
import DotLoader from "@/components/ui/dotloader";

export default function Home() {
  const { wallet, signAndSendTransaction } = useWalletStore();
  const router = useRouter();
  const { prompt } = usePrompt();
  const { addUnprocessed } = useUnprocessedChat();

  const [isTxnLoading, setIsTxnLoading] = useState(false);

  const handleChatStart = async () => {
    if (isTxnLoading) return;

    try {
      setIsTxnLoading(true);

      const raw = localStorage.getItem("seed");
      const seed = raw === null ? 0 : Number(raw) + 1;

      if (!wallet || !prompt) {
        alert("wallet or prompt missing");
        return;
      }

      const walletAddress = address(wallet.smartWallet as string);
      const transactionSigner = createNoopSigner(walletAddress);

      const chatContext = await getChatContext(wallet.smartWallet, seed);

      const createChatInstruction = getInitializeInstruction({
        seed,
        user: transactionSigner,
        chatContext,
      });

      const keys = createChatInstruction.accounts.map(
        (account: { address: string; signer?: boolean; role: number }) => ({
          pubkey: new PublicKey(account.address),
          isSigner: !!account.signer,
          isWritable: account.role === 1,
        })
      );

      const signature = await signAndSendTransaction({
        instructions: [
          {
            data: Buffer.from(createChatInstruction.data),
            keys,
            programId: new PublicKey(createChatInstruction.programAddress),
          },
        ],
        transactionOptions: {
          computeUnitLimit: 500_000,
        },
      });

      console.log("Transaction signature:", signature);

      const [responseAddress] = await getProgramDerivedAddress({
        seeds: [
          Buffer.from("response"),
          getAddressEncoder().encode(walletAddress),
        ],
        programAddress: CHAT_AGENT_PROGRAM_ADDRESS,
      });

      saveChat({
        seed,
        chatContext: chatContext.toString(),
        responseAddress: responseAddress.toString(),
        title: prompt,
        messages: [],
      });

      localStorage.setItem("seed", String(seed));
      addUnprocessed(prompt);

      router.push(`/chat/${chatContext}`);
    } catch (error) {
      console.error("Failed to start chat:", error);
    } finally {
      setIsTxnLoading(false);
    }
  };

  return (
    <main className="px-10">
      <Header />

      <div className="flex bg-[url('/bg2.png')] bg-cover bg-no-repeat min-h-[90vh] w-full flex-col items-center justify-center">
        {isTxnLoading && (
          <div className="my-6">
            <DotLoader label="sending transaction…" />
          </div>
        )}

        <Chat handleChat={handleChatStart} />
      </div>
    </main>
  );
}

// seed 0 ixn
// [
//   {
//     seed: 0,
//     chatContext: "6AutKZY6HpWuLbw8XfariMDREPZYxmiH1jqs3utudtrD",
//     responseAddress: "HRyJdLiPkPnwoxhP8GTcpjyGfssV24meghgsK33mGJyA",
//     title: "yo",
//     messages: [{ type: "user", text: "gm", timestamp: 1767906419189 }],
//   },
// ];
