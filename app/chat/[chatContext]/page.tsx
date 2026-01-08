"use client";
import { useParams } from "next/navigation";
import { useWalletStore } from "@lazorkit/wallet";
import {
  address,
  createNoopSigner,
  getProgramDerivedAddress,
  getAddressEncoder,
  Address,
} from "@solana/kit";
import { getAiInferenceInstructionAsync } from "@/program-helpers";
import { llmProgramAddress } from "@/lib/config";
import { CHAT_AGENT_PROGRAM_ADDRESS } from "@/program-helpers/programs";
import Chat from "../../components/chat";
import Header from "../../components/header";
import { usePrompt } from "@/context/prompt-context";
import { useState, useEffect, useRef } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { getChat, updateChatMessages } from "@/lib/chatHistory";
import { useUnprocessedChat } from "@/lib/hooks";

const connection = new Connection("https://api.devnet.solana.com");

export default function ChatPage() {
  const { chatContext: chatContextParam } = useParams();
  const { wallet } = useWalletStore();
  const { prompt, setPrompt } = usePrompt();
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const chatContext = address(chatContextParam as string);
  const chatData = getChat(chatContext.toString());
  const seed = chatData?.seed || 0;

  const [messages, setMessages] = useState<
    { type: "user" | "ai"; text: string; timestamp: number }[]
  >(chatData?.messages || []);
  const { unprocessed, setUnprocessed } = useUnprocessedChat();
  const processingRef = useRef(false);

  const pollResponse = async (
    responseAddress: Address,
    currentMessages: { type: "user" | "ai"; text: string; timestamp: number }[]
  ) => {
    while (true) {
      try {
        const accountInfo = await connection.getAccountInfo(
          new PublicKey(responseAddress.toString())
        );

        if (accountInfo && accountInfo.data.length > 8) {
          const dataView = new DataView(
            accountInfo.data.buffer,
            accountInfo.data.byteOffset + 8
          );
          const len = dataView.getUint32(0, true);
          const responseBytes = accountInfo.data.slice(12, 12 + len);
          const response = new TextDecoder().decode(responseBytes);

          console.log("Response from chat:", response);
          const fullDataDecoded = new TextDecoder().decode(accountInfo.data);
          console.log("Full response data:", fullDataDecoded);

          if (response) {
            const updatedMessages = [
              ...currentMessages,
              { type: "ai" as const, text: response, timestamp: Date.now() },
            ];
            setMessages(updatedMessages);
            updateChatMessages(chatContext.toString(), updatedMessages);
            setAiResponse(response);
            setIsLoading(false);
            break;
          }
        }
      } catch (error) {
        console.error("Error fetching response:", error);
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  };

  const processChatText = async (chatText: string) => {
    const timestamp = Date.now();
    const newMessages = [
      ...messages,
      { type: "user" as const, text: chatText, timestamp },
    ];
    setMessages(newMessages);
    updateChatMessages(chatContext.toString(), newMessages);

    const walletAddress = address(wallet!.smartWallet as string);
    const transactionSigner = createNoopSigner(walletAddress);

    const [responsePda] = await getProgramDerivedAddress({
      seeds: [
        Buffer.from("response"),
        getAddressEncoder().encode(walletAddress),
      ],
      programAddress: CHAT_AGENT_PROGRAM_ADDRESS,
    });

    const [vaultPda] = await getProgramDerivedAddress({
      seeds: [Buffer.from("vault"), getAddressEncoder().encode(responsePda)],
      programAddress: CHAT_AGENT_PROGRAM_ADDRESS,
    });

    const [inferencePda] = await getProgramDerivedAddress({
      seeds: [
        Buffer.from("inference"),
        getAddressEncoder().encode(chatContext),
      ],
      programAddress: llmProgramAddress,
    });

    const aiInferenceInstruction = await getAiInferenceInstructionAsync({
      user: transactionSigner,
      chatContext,
      inference: inferencePda,
      text: chatText,
      seed,
    });

    console.log("AI Inference Instruction:", aiInferenceInstruction);
    pollResponse(responsePda, newMessages);
  };

  // Process unprocessed chats - fixed version
  useEffect(() => {
    if (unprocessed.length > 0 && wallet && !processingRef.current) {
      processingRef.current = true;

      const processAll = async () => {
        const toProcess = [...unprocessed];

        for (const chatText of toProcess) {
          await processChatText(chatText);
        }

        // Clear all processed messages at once
        setUnprocessed([]);
        processingRef.current = false;
      };

      processAll();
    }
  }, [unprocessed.length > 0, wallet?.smartWallet]);

  const handleChat = async () => {
    if (!wallet || !prompt) return;

    setIsLoading(true);
    setAiResponse(null);

    const timestamp = Date.now();
    const newMessages = [
      ...messages,
      { type: "user" as const, text: prompt, timestamp },
    ];
    setMessages(newMessages);
    updateChatMessages(chatContext.toString(), newMessages);

    const walletAddress = address(wallet.smartWallet as string);
    const transactionSigner = createNoopSigner(walletAddress);

    const [responsePda] = await getProgramDerivedAddress({
      seeds: [
        Buffer.from("response"),
        getAddressEncoder().encode(walletAddress),
      ],
      programAddress: CHAT_AGENT_PROGRAM_ADDRESS,
    });

    const [vaultPda] = await getProgramDerivedAddress({
      seeds: [Buffer.from("vault"), getAddressEncoder().encode(responsePda)],
      programAddress: CHAT_AGENT_PROGRAM_ADDRESS,
    });

    const [inferencePda] = await getProgramDerivedAddress({
      seeds: [
        Buffer.from("inference"),
        getAddressEncoder().encode(chatContext),
      ],
      programAddress: llmProgramAddress,
    });

    const aiInferenceInstruction = await getAiInferenceInstructionAsync({
      user: transactionSigner,
      chatContext,
      inference: inferencePda,
      text: prompt,
      seed,
    });

    console.log("AI Inference Instruction:", aiInferenceInstruction);
    pollResponse(responsePda, newMessages);
    setPrompt("");
  };

  return (
    <main className="px-10">
      <Header />
      <div className="flex bg-[url('/bg2.png')] bg-cover bg-no-repeat min-h-[90vh] w-full flex-col items-center justify-center">
        {messages.map((msg, index) => (
          <div key={index}>
            <strong>{msg.type === "user" ? "You:" : "AI:"}</strong> {msg.text}
          </div>
        ))}
        {isLoading && <div>Loading AI response...</div>}
        <Chat handleChat={handleChat} />
      </div>
    </main>
  );
}
