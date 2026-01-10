"use client";
import { useParams } from "next/navigation";
import { useWalletStore, PublicKey } from "@lazorkit/wallet";
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
import { Connection } from "@solana/web3.js";
import { getChat, updateChatMessages } from "@/lib/chatHistory";
import { useUnprocessedChat } from "@/lib/hooks";
import { Check, Copy } from "lucide-react";

const connection = new Connection("https://api.devnet.solana.com");

export default function ChatPage() {
  const { chatContext: chatContextParam } = useParams();
  const { wallet, signAndSendTransaction } = useWalletStore();
  const { prompt, setPrompt } = usePrompt();
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const chatContext = address(chatContextParam as string);
  const chatData = getChat(chatContext.toString());
  const seed = chatData?.seed || 0;

  const [messages, setMessages] = useState<
    { type: "user" | "ai"; text: string; timestamp: number }[]
  >(chatData?.messages || []);
  const { unprocessed, setUnprocessed } = useUnprocessedChat();
  const processingRef = useRef(false);
  const [unfetchedResponsePda, setUnfetchedResponsePda] = useState<
    string | null
  >(null);

  const pollResponse = async (
    responseAddress: Address,
    currentMessages: { type: "user" | "ai"; text: string; timestamp: number }[]
  ): Promise<boolean> => {
    const maxPollTime = 15000; // 15 seconds max
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    console.log("Polling for response at PDA:", responseAddress.toString());

    try {
      while (Date.now() - startTime < maxPollTime) {
        try {
          const accountInfo = await connection.getAccountInfo(
            new PublicKey(responseAddress.toString())
          );

          console.log("Fetched account info:", accountInfo);

          if (accountInfo && accountInfo.data.length > 8) {
            const dataView = new DataView(
              accountInfo.data.buffer,
              accountInfo.data.byteOffset + 8
            );
            const len = dataView.getUint32(0, true);
            const responseBytes = accountInfo.data.slice(12, 12 + len);
            const response = new TextDecoder().decode(responseBytes);

            console.log("Response from chat:", response);

            if (response) {
              const updatedMessages = [
                ...currentMessages,
                { type: "ai" as const, text: response, timestamp: Date.now() },
              ];
              setMessages(updatedMessages);
              updateChatMessages(chatContext.toString(), updatedMessages);
              setIsLoading(false);
              return true;
            }
          }
        } catch (error) {
          console.error("Error fetching response:", error);
        }

        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }

      console.warn(
        `Failed to get response within ${maxPollTime / 1000} seconds`
      );

      // Save unfetched response PDA to localStorage
      localStorage.setItem("unfetchedResponsePda", responseAddress.toString());
      setUnfetchedResponsePda(responseAddress.toString());

      setIsLoading(false);
      alert("Timeout: AI response took too long. Please try again.");
      return false;
    } catch (error) {
      console.error("Poll response error:", error);
      setIsLoading(false);
      alert("Error polling response. Please check console for details.");
      return false;
    }
  };

  const sendAiInferenceTransaction = async (
    instruction: Awaited<ReturnType<typeof getAiInferenceInstructionAsync>>
  ): Promise<boolean> => {
    try {
      const keys = instruction.accounts.map(
        (account: { address: string; signer?: boolean; role: number }) => ({
          pubkey: new PublicKey(account.address),
          isSigner: account.signer ? true : false,
          isWritable: account.role === 1,
        })
      );

      console.log("About to sign and send AI inference transaction");
      const signature = await signAndSendTransaction({
        instructions: [
          {
            data: Buffer.from(instruction.data),
            keys: keys,
            programId: new PublicKey(instruction.programAddress),
          },
        ],
        transactionOptions: {
          feeToken: "USDC",
          computeUnitLimit: 500_000,
        },
      });

      console.log("AI Inference Transaction sent successfully:", signature);
      return true;
    } catch (error) {
      console.error("Error sending AI inference transaction:", error);
      setIsLoading(false);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to send transaction: ${errorMessage}`);
      return false;
    }
  };

  const handleCopy = async (textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch (err) {
      console.error(err);
    }
  };

  const processChatText = async (chatText: string): Promise<boolean> => {
    try {
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

      const [inferencePda] = await getProgramDerivedAddress({
        seeds: [
          Buffer.from("inference"),
          getAddressEncoder().encode(walletAddress),
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

      // Send transaction and only poll if successful
      const txnSent = await sendAiInferenceTransaction(aiInferenceInstruction);
      if (txnSent) {
        pollResponse(responsePda, newMessages);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error processing chat text:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to process message: ${errorMessage}`);
      setIsLoading(false);
      return false;
    }
  };

  // Fetch unfetched responses on page load
  useEffect(() => {
    const fetchUnfetchedResponse = async () => {
      const pdaAddress = localStorage.getItem("unfetchedResponsePda");

      if (!pdaAddress) {
        setUnfetchedResponsePda(null);
        return;
      }

      setUnfetchedResponsePda(pdaAddress);

      try {
        console.log("Fetching unfetched response from:", pdaAddress);
        const responseAddress = address(pdaAddress);
        const success = await pollResponse(responseAddress, messages);
        // Only remove from localStorage if successfully fetched
        if (success) {
          localStorage.removeItem("unfetchedResponsePda");
          setUnfetchedResponsePda(null);
        }
      } catch (error) {
        console.error("Error fetching unfetched response:", error);
      }
    };

    fetchUnfetchedResponse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatContext]);

  // Process unprocessed chats - fixed version
  useEffect(() => {
    if (unprocessed.length > 0 && wallet && !processingRef.current) {
      processingRef.current = true;

      const processAll = async () => {
        const toProcess = [...unprocessed];
        const successfulChats: string[] = [];

        for (const chatText of toProcess) {
          const success = await processChatText(chatText);
          if (success) {
            successfulChats.push(chatText);
          }
        }

        // Only clear successfully processed messages
        if (successfulChats.length > 0) {
          setUnprocessed(
            unprocessed.filter((msg) => !successfulChats.includes(msg))
          );
        }
        processingRef.current = false;
      };

      processAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unprocessed.length, wallet]);

  const handleChat = async () => {
    try {
      if (!wallet || !prompt) return;

      setIsLoading(true);

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

      const [inferencePda] = await getProgramDerivedAddress({
        seeds: [
          Buffer.from("inference"),
          getAddressEncoder().encode(walletAddress),
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

      // Send transaction and only poll if successful
      const txnSent = await sendAiInferenceTransaction(aiInferenceInstruction);
      if (txnSent) {
        pollResponse(responsePda, newMessages);
      }

      setPrompt("");
    } catch (error) {
      console.error("Error in handleChat:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to send message: ${errorMessage}`);
      setIsLoading(false);
    }
  };

  return (
    <main className="px-10">
      <Header />
      <div className="flex bg-[url('/bg2.png')] bg-cover bg-no-repeat min-h-[90vh] w-full flex-col items-center justify-center">
        <div className="w-full max-h-[60vh] overflow-y-scroll max-w-4xl space-y-4 mb-8 px-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                msg.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.type === "user"
                    ? "bg-blue-500 text-white rounded-br-none"
                    : "bg-gray-200 text-gray-900 rounded-bl-none"
                }`}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none flex items-start gap-2">
                  <span>{msg.type === "user" ? "👤" : "🤖"}</span>
                  <span className="flex-1">{msg.text}</span>
                  <button className="cursor-pointer">
                    {copied ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy
                        onClick={() => {
                          handleCopy(msg.text);
                        }}
                        className="w-3 h-3 hover:text-pink-600"
                      />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {isLoading && <div>Loading AI response...</div>}
        {unfetchedResponsePda && <div>Fetching previous response...</div>}
        <Chat
          handleChat={handleChat}
          disabled={isLoading || !!unfetchedResponsePda}
        />
      </div>
    </main>
  );
}
