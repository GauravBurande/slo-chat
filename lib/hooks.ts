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
