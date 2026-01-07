"use client";

import { PromptProvider } from "@/context/prompt-context";
import { LazorkitProvider } from "@lazorkit/wallet";
import { DEFAULT_CONFIG } from "@lazorkit/wallet";

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
