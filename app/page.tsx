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
} from "@solana/kit";
import { getChatContext } from "@/lib/llm-accounts";
import { useRouter } from "next/navigation";
import { usePrompt } from "@/context/prompt-context";
import { saveChat } from "@/lib/chatHistory";
import { CHAT_AGENT_PROGRAM_ADDRESS } from "@/program-helpers/programs";
import { useUnprocessedChat } from "@/lib/hooks";

export default function Home() {
  const { wallet, signAndSendTransaction } = useWalletStore();
  const router = useRouter();
  const { prompt } = usePrompt();
  const { addUnprocessed } = useUnprocessedChat();

  const handleChatStart = async () => {
    try {
      let seed: number;
      const raw = localStorage.getItem("seed");
      if (raw === null) {
        seed = 0;
      } else {
        seed = Number(raw) + 1;
      }
      console.log("seed value:", seed);
      if (wallet && prompt) {
        console.log("wallet and prompt exist");
        const walletAddress = address(wallet?.smartWallet as string);
        const transactionSigner = createNoopSigner(walletAddress);
        console.log("walletAddress:", walletAddress);

        const chatContext = await getChatContext(wallet.smartWallet, seed);
        console.log("chatContext:", chatContext);

        const createChatInstruction = getInitializeInstruction({
          seed,
          user: transactionSigner,
          chatContext,
        });

        const keys = createChatInstruction.accounts.map(
          (account: { address: string; signer?: boolean; role: number }) => ({
            pubkey: new PublicKey(account.address),
            isSigner: account.signer ? true : false,
            isWritable: account.role === 1,
          })
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

        console.log("responseAddress:", responseAddress);

        saveChat({
          seed,
          chatContext: chatContext.toString(),
          responseAddress: responseAddress.toString(),
          title: prompt,
          messages: [],
        });

        localStorage.setItem("seed", String(seed));

        console.log("Chat saved");
        addUnprocessed(prompt);
        console.log("About to navigate");
        router.push(`/chat/${chatContext}`);
      } else {
        alert("wallet or prompt missing");
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
