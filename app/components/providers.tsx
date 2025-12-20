"use client";

import { LazorkitProvider } from "@lazorkit/wallet";
import { DEFAULT_CONFIG } from "@lazorkit/wallet";
import { PromptProvider } from "../context/prompt-context";

const Providers = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <LazorkitProvider
      rpcUrl={DEFAULT_CONFIG.rpcUrl}
      portalUrl={DEFAULT_CONFIG.portalUrl}
      paymasterConfig={DEFAULT_CONFIG.paymasterConfig}
    >
      <PromptProvider>{children}</PromptProvider>
    </LazorkitProvider>
  );
};

export default Providers;
