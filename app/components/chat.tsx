"use client";

interface IChat {
  handleChat: () => void;
}

const Chat = ({ handleChat }: IChat) => {
  return (
    <section className="flex items-center font-mono">
      <input
        type="text"
        placeholder="what do you want to chat about?"
        className="border-b-2 min-w-3xl focus:outline-none px-4 py-2"
      />
      <button
        onClick={handleChat}
        className="uppercase font-stretch-semi-expanded cursor-pointer border-b-2 px-4 py-2"
      >
        {" "}
        start chat{" "}
      </button>
    </section>
  );
};

export default Chat;
