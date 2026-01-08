"use client";

import { getInitializeInstruction } from "@/program-helpers";
import Chat from "./components/chat";
import Header from "./components/header";
import { PublicKey, useWalletStore } from "@lazorkit/wallet";
import {
  address,
  createNoopSigner,
  getProgramDerivedAddress,
  getAddressEncoder,
  AccountMeta,
} from "@solana/kit";
import { getChatContext } from "@/lib/llm-accounts";
import { useRouter } from "next/navigation";
import { usePrompt } from "@/context/prompt-context";
import { saveChat } from "@/lib/chatHistory";
import { CHAT_AGENT_PROGRAM_ADDRESS } from "@/program-helpers/programs";
import { useUnprocessedChat } from "@/lib/hooks";
import { useState, useEffect } from "react";

export default function Home() {
  const { wallet, signAndSendTransaction } = useWalletStore();
  const router = useRouter();
  const { prompt } = usePrompt();
  const { addUnprocessed } = useUnprocessedChat();
  const [seed, setSeed] = useState(0);

  useEffect(() => {
    const raw = localStorage.getItem("seed");
    const next = raw === null ? 0 : Number(raw) + 1;
    localStorage.setItem("seed", String(next));
    setTimeout(() => setSeed(next), 0);
  }, []);

  const handleChatStart = async () => {
    try {
      if (wallet && prompt) {
        const walletAddress = address(wallet?.smartWallet as string);
        const transactionSigner = createNoopSigner(walletAddress);
        const chatContext = await getChatContext(wallet.smartWallet, seed);

        const createChatInstruction = getInitializeInstruction({
          seed,
          user: transactionSigner,
          chatContext,
        });

        console.log(createChatInstruction);

        const keys = createChatInstruction.accounts.map((account: any) => ({
          pubkey: new PublicKey(account.address),
          isSigner: account.signer ? true : false,
          isWritable: account.role === 1,
        }));

        console.log(
          "Instruction account role:",
          createChatInstruction.accounts[0].role
        );

        const signature = await signAndSendTransaction({
          instructions: [
            {
              data: Buffer.from(createChatInstruction.data),
              keys: keys,
              programId: new PublicKey(createChatInstruction.programAddress),
            },
          ],
          transactionOptions: {
            feeToken: "USDC",
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

        addUnprocessed(prompt);

        router.push(`/chat/${chatContext}`);
      }
    } catch (error) {
      console.error("Failed to start chat:", error);
    }
  };

  return (
    <main className="px-10">
      <Header />
      <div className="flex bg-[url('/bg2.png')] bg-cover bg-no-repeat min-h-[90vh] w-full flex-col items-center justify-center">
        <Chat handleChat={handleChatStart} />
      </div>
    </main>
  );
}
