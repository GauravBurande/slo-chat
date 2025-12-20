"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type PromptContextType = {
  prompt: string;
  setPrompt: (value: string) => void;
  clearPrompt: () => void;
};

const PromptContext = createContext<PromptContextType | null>(null);

export function PromptProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState("");

  const clearPrompt = () => setPrompt("");

  return (
    <PromptContext.Provider value={{ prompt, setPrompt, clearPrompt }}>
      {children}
    </PromptContext.Provider>
  );
}

export function usePrompt() {
  const ctx = useContext(PromptContext);
  if (!ctx) {
    throw new Error("usePrompt must be used inside <PromptProvider />");
  }
  return ctx;
}
