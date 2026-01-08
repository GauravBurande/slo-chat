import { useState } from "react";

type SetValue<T> = React.Dispatch<React.SetStateAction<T>>;

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, SetValue<T>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setStoredValue: SetValue<T> = (val) => {
    setValue((prev) => {
      const nextValue =
        typeof val === "function" ? (val as (v: T) => T)(prev) : val;

      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(nextValue));
        }
      } catch {}

      return nextValue;
    });
  };

  return [value, setStoredValue];
}

// Function to process unprocessed chat text from local storage
export function processUnprocessedChatText(key: string) {
  try {
    const storedValue = window.localStorage.getItem(key);
    if (storedValue) {
      const parsedValue = JSON.parse(storedValue);
      // Process the parsed value as needed
      console.log("Processing unprocessed chat text:", parsedValue);
      // After processing, you might want to remove it from local storage
      window.localStorage.removeItem(key);
    }
  } catch (error) {
    console.error("Error processing unprocessed chat text:", error);
  }
}

export function useUnprocessedChat() {
  const [unprocessed, setUnprocessed] = useLocalStorage<string[]>(
    "unprocessedChat",
    []
  );

  const addUnprocessed = (text: string) => {
    setUnprocessed((prev) => [...prev, text]);
  };

  return { unprocessed, addUnprocessed, setUnprocessed };
}
