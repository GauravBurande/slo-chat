import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useWalletStore } from "@lazorkit/wallet";
import {
  address,
  createNoopSigner,
  getProgramDerivedAddress,
  getAddressEncoder,
} from "@solana/kit";
import { getAiInferenceInstructionAsync } from "@/program-helpers";
import { llmProgramAddress } from "@/lib/config";
import { CHAT_AGENT_PROGRAM_ADDRESS } from "@/program-helpers/programs";
import { getChat, updateChatMessages } from "@/lib/chatHistory";
import { useUnprocessedChat } from "@/lib/hooks";
import { usePrompt } from "@/context/prompt-context";
import {
  pollResponse,
  sendAiInferenceTransaction,
  Message,
} from "@/lib/chatUtils";
import { sleep } from "./basicUtils";

export const useChatLogic = () => {
  const { chatContext: chatContextParam } = useParams();
  const { wallet, signAndSendTransaction } = useWalletStore();
  const { prompt, setPrompt } = usePrompt();
  const [isLoading, setIsLoading] = useState(false);
  const [unfetchedResponsePda, setUnfetchedResponsePda] = useState<
    string | null
  >(null);

  const chatContext = address(chatContextParam as string);
  const chatData = getChat(chatContext.toString());
  const seed = chatData?.seed || 0;

  const [messages, setMessages] = useState<Message[]>(chatData?.messages || []);
  const { unprocessed, setUnprocessed } = useUnprocessedChat();
  const processingRef = useRef(false);

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
      const txnSent = await sendAiInferenceTransaction(
        aiInferenceInstruction,
        signAndSendTransaction,
        setIsLoading
      );
      if (txnSent) {
        pollResponse(
          responsePda,
          newMessages,
          setMessages,
          updateChatMessages,
          chatContext.toString(),
          setIsLoading,
          setUnfetchedResponsePda
        );
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
        const success = await pollResponse(
          responseAddress,
          messages,
          setMessages,
          updateChatMessages,
          chatContext.toString(),
          setIsLoading,
          setUnfetchedResponsePda
        );
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
      const txnSent = await sendAiInferenceTransaction(
        aiInferenceInstruction,
        signAndSendTransaction,
        setIsLoading
      );

      console.log("Transaction sent:", txnSent);

      if (txnSent) {
        // sleep for 0.5 sec
        await sleep(500);

        const timestamp = Date.now();
        const newMessages = [
          ...messages,
          { type: "user" as const, text: prompt, timestamp },
        ];
        setMessages(newMessages);
        updateChatMessages(chatContext.toString(), newMessages);

        pollResponse(
          responsePda,
          newMessages,
          setMessages,
          updateChatMessages,
          chatContext.toString(),
          setIsLoading,
          setUnfetchedResponsePda
        );

        setPrompt("");
      }
    } catch (error) {
      console.error("Error in handleChat:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to send message: ${errorMessage}`);
      setIsLoading(false);
    }
  };

  return {
    messages,
    isLoading,
    unfetchedResponsePda,
    handleChat,
  };
};
