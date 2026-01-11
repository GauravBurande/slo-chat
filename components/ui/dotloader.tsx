"use client";

export default function DotLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-400 animate-bounce [animation-delay:450ms]" />
      </div>

      {label && <p className="text-sm text-slate-400">{label}</p>}
    </div>
  );
}
