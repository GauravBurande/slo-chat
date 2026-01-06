import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ChatAgent } from "../target/types/chat_agent";
import { PublicKey } from "@solana/web3.js";

describe("chat-agent", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.chatAgent as Program<ChatAgent>;
  const provider = anchor.getProvider();
  const payer = provider.wallet.payer;
  const programId = program.programId;
  const llmProgramAddress = new PublicKey(
    "LLM4VF4uxgbcrUdwF9rBh7MUEypURp8FurEdZLhZqed"
  );

  const seed = 0;

  // const [config] = PublicKey.findProgramAddressSync(
  //   [Buffer.from("config")],
  //   llmProgramAddress
  // );

  const [chatContext] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("chat_context"),
      payer.publicKey.toBuffer(),
      Buffer.from([seed]),
    ],
    llmProgramAddress
  );

  const [inference] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("inference"),
      payer.publicKey.toBuffer(),
      chatContext.toBuffer(),
    ],
    llmProgramAddress
  );
  const [response] = PublicKey.findProgramAddressSync(
    [Buffer.from("response"), payer.publicKey.toBuffer()],
    programId
  );

  xit("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods
      .initialize(seed)
      .accountsPartial({
        chatContext,
        oracleProgram: llmProgramAddress,
        user: payer.publicKey,
      })
      .rpc();

    console.log("Your transaction signature", tx);
  });
  it("create inference!", async () => {
    // Add your test here.
    const text = "yo!";
    const tx = await program.methods
      .aiInference(text, seed)
      .accountsPartial({
        chatContext,
        user: payer.publicKey,
        inference,
        response,
      })
      .rpc();

    console.log("Your transaction signature", tx);
  });
});
