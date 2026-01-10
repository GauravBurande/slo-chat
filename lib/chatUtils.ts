import { Connection, PublicKey } from "@solana/web3.js";
import { Address } from "@solana/kit";

const connection = new Connection("https://api.devnet.solana.com");

export interface Message {
  type: "user" | "ai";
  text: string;
  timestamp: number;
}

export const pollResponse = async (
  responseAddress: Address,
  currentMessages: Message[],
  setMessages: (messages: Message[]) => void,
  updateChatMessages: (chatContext: string, messages: Message[]) => void,
  chatContext: string,
  setIsLoading: (loading: boolean) => void,
  setUnfetchedResponsePda: (pda: string | null) => void
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
            updateChatMessages(chatContext, updatedMessages);
            setIsLoading(false);
            return true;
          }
        }
      } catch (error) {
        console.error("Error fetching response:", error);
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    console.warn(`Failed to get response within ${maxPollTime / 1000} seconds`);

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
