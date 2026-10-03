"use client";

// Placeholder demo screen: proves the full path (input → backend → streamed answer → saved run).
// Replace the copy and layout once the challenge is picked; keep streamRun.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { listRuns, streamRun, type Run } from "@/lib/api";

type Status = "idle" | "streaming" | "done" | "error";

export default function Home() {
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [runs, setRuns] = useState<Run[]>([]);
  const abort = useRef<AbortController | null>(null);
  // Tokens collect here and reach React once per animation frame, not once per token.
  const pending = useRef("");
  const frame = useRef<number | null>(null);

  useEffect(() => {
    listRuns().then(setRuns).catch(() => {});
    return () => {
      abort.current?.abort();
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  function flush() {
    frame.current = null;
    const text = pending.current;
    pending.current = "";
    if (text) setAnswer((prev) => prev + text);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    abort.current?.abort();
    abort.current = new AbortController();
    pending.current = "";
    setAnswer("");
    setError("");
    setStatus("streaming");
    try {
      await streamRun(
        input,
        {
          onToken: (t) => {
            pending.current += t;
            frame.current ??= requestAnimationFrame(flush);
          },
          onDone: () => {
            flush();
            setStatus("done");
            listRuns().then(setRuns).catch(() => {});
          },
          onError: (m) => {
            flush();
            setError(m);
            setStatus("error");
          },
        },
        abort.current.signal,
      );
    } finally {
      setStatus((s) => (s === "streaming" ? "idle" : s));
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-16">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col gap-2"
        >
          <span className="font-mono text-xs uppercase tracking-widest opacity-60">Hack-Nation · Vienna</span>
          <h1 className="text-4xl font-semibold tracking-tight text-balance">Project name goes here</h1>
          <p className="opacity-70">One sentence: who has the problem, and what this does for them.</p>
        </motion.header>

        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
          <input
            id="demo-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Try the demo input…"
            className="flex-1 rounded-xl border border-black/15 bg-transparent px-4 py-3 outline-none focus:border-black/50 dark:border-white/20 dark:focus:border-white/60"
          />
          <motion.button
            whileTap={{ scale: 0.96 }}
            disabled={status === "streaming"}
            className="rounded-xl bg-foreground px-5 py-3 font-medium text-background disabled:opacity-50"
          >
            {status === "streaming" ? "Thinking…" : "Run"}
          </motion.button>
        </form>

        <motion.section
          layout
          aria-live="polite"
          className="min-h-32 whitespace-pre-wrap rounded-2xl border border-black/10 p-5 leading-relaxed dark:border-white/15"
        >
          {status === "idle" && !answer && <p className="opacity-50">The answer streams in here.</p>}
          {answer}
          {status === "streaming" && (
            <motion.span
              aria-hidden
              className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 bg-current"
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.6 }}
            />
          )}
          {status === "error" && <p className="mt-2 text-red-600 dark:text-red-400">{error}</p>}
        </motion.section>

        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-xs uppercase tracking-widest opacity-60">Recent runs</h2>
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {runs.slice(0, 5).map((r) => (
                <motion.li
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="truncate rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15"
                >
                  <span className="font-mono opacity-50">#{r.id}</span> {r.input}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      </main>
    </MotionConfig>
  );
}
