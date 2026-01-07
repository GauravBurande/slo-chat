import {
  address,
  getAddressEncoder,
  getProgramDerivedAddress,
} from "@solana/kit";
import { llmProgramAddress } from "./config";

export const getChatContext = async (payer: string, seed: number) => {
  const pubkey = address(payer);
  const addressEncoder = getAddressEncoder();
  const addressBytes = addressEncoder.encode(pubkey);
  const [chatContext] = await getProgramDerivedAddress({
    seeds: [Buffer.from("chat_context"), addressBytes, Buffer.from([seed])],
    programAddress: llmProgramAddress,
  });

  return chatContext;
};
