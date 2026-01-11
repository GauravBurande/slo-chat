import { Connection, PublicKey } from "@solana/web3.js";
import { Address } from "@solana/kit";

const connection = new Connection("https://api.devnet.solana.com");

export interface Message {
  type: "user" | "ai";
  text: string;
  timestamp: number;
}

const LAST_AI_RESPONSE_KEY = "lastAiResponse";

export const pollResponse = async (
  responseAddress: Address,
  currentMessages: Message[],
  setMessages: (messages: Message[]) => void,
  updateChatMessages: (chatContext: string, messages: Message[]) => void,
  chatContext: string,
  setIsLoading: (loading: boolean) => void,
  setUnfetchedResponsePda: (pda: string | null) => void
): Promise<boolean> => {
  const maxPollTime = 15_000;
  const pollInterval = 2_000;
  const startTime = Date.now();

  console.log("Polling for response at PDA:", responseAddress.toString());

  // 👇 read last AI message from localStorage
  const lastStoredAiResponse = localStorage.getItem(LAST_AI_RESPONSE_KEY);

  try {
    while (Date.now() - startTime < maxPollTime) {
      try {
        const accountInfo = await connection.getAccountInfo(
          new PublicKey(responseAddress.toString()),
          { commitment: "finalized" }
        );

        if (accountInfo && accountInfo.data.length > 8) {
          const dataView = new DataView(
            accountInfo.data.buffer,
            accountInfo.data.byteOffset + 8
          );

          const len = dataView.getUint32(0, true);
          const responseBytes = accountInfo.data.slice(12, 12 + len);
          const response = new TextDecoder().decode(responseBytes).trim();

          if (!response) {
            await new Promise((r) => setTimeout(r, pollInterval));
            continue;
          }

          // 🚫 duplicate check via localStorage instead of chat history
          if (lastStoredAiResponse === response) {
            console.log("Duplicate AI response detected, continuing polling");
            await new Promise((r) => setTimeout(r, pollInterval));
            continue;
          }

          // ✅ new response
          const updatedMessages = [
            ...currentMessages,
            {
              type: "ai" as const,
              text: response,
              timestamp: Date.now(),
            },
          ];

          setMessages(updatedMessages);
          updateChatMessages(chatContext, updatedMessages);

          // 🔑 persist last AI response
          localStorage.setItem(LAST_AI_RESPONSE_KEY, response);

          setIsLoading(false);
          return true;
        }
      } catch (err) {
        console.error("Error fetching response:", err);
      }

      await new Promise((r) => setTimeout(r, pollInterval));
    }

    console.warn(`Failed to get response within ${maxPollTime / 1000}s`);
    localStorage.setItem("unfetchedResponsePda", responseAddress.toString());
    setUnfetchedResponsePda(responseAddress.toString());
    setIsLoading(false);

    alert(
      "Timeout: AI response took too long. Refresh the page! Please try again."
    );
    return false;
  } catch (err) {
    console.error("Poll response error:", err);
    setIsLoading(false);
    alert("Error polling response. Please check console for details.");
    return false;
  }
};

export const sendAiInferenceTransaction = async (
  instruction: Awaited<
    ReturnType<
      typeof import("@/program-helpers").getAiInferenceInstructionAsync
    >
  >,
  signAndSendTransaction: (params: {
    instructions: Array<{
      data: Buffer;
      keys: Array<{
        pubkey: import("@solana/web3.js").PublicKey;
        isSigner: boolean;
        isWritable: boolean;
      }>;
      programId: import("@solana/web3.js").PublicKey;
    }>;
    transactionOptions: {
      feeToken: string;
      computeUnitLimit: number;
    };
  }) => Promise<string>,
  setIsLoading: (loading: boolean) => void
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
