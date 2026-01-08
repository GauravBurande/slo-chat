interface Message {
  type: "user" | "ai";
  text: string;
  timestamp: number;
}

interface Chat {
  seed: number;
  chatContext: string;
  responseAddress: string;
  title: string;
  messages: Message[];
}

const STORAGE_KEY = "slo-chat-history";

export const getChats = (): Chat[] => {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveChat = (chat: Chat) => {
  const chats = getChats();
  const existingIndex = chats.findIndex(
    (c) => c.chatContext === chat.chatContext
  );
  if (existingIndex >= 0) {
    chats[existingIndex] = chat;
  } else {
    chats.push(chat);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
};

export const updateChatMessages = (
  chatContext: string,
  messages: Message[]
) => {
  const chats = getChats();
  const chat = chats.find((c) => c.chatContext === chatContext);
  if (chat) {
    chat.messages = messages.slice(-15); // Keep last 15
    saveChat(chat);
  }
};

export const getChat = (chatContext: string): Chat | undefined => {
  const chats = getChats();
  return chats.find((c) => c.chatContext === chatContext);
};
