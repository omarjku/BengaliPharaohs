"use client";

// Fetch pattern: one state value that is either loading, error or success,
// so the UI can never show a spinner and an error at the same time.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { getHealth, listRuns, type Health, type Run } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; health: Health; runs: Run[] };

// Keeps the skeleton on screen long enough to see it locally. Remove for the real app.
const DEMO_DELAY_MS = 600;

export function FetchDemo() {
  const [state, setState] = useState<State>({ status: "loading" });
  const abort = useRef<AbortController | null>(null);

  // Only sets state after an await, so it's safe to start from useEffect.
  async function load(signal: AbortSignal, simulateError = false) {
    try {
      await new Promise((r) => setTimeout(r, DEMO_DELAY_MS));
      if (simulateError) throw new Error("Simulated failure: this is what users see when the backend is down.");
      const [health, runs] = await Promise.all([getHealth(signal), listRuns()]);
      if (signal.aborted) return;
      setState({ status: "success", health, runs });
    } catch (e) {
      if (signal.aborted) return; // the user started a newer request or left the page
      const message = e instanceof Error ? e.message : "Something went wrong.";
      setState({ status: "error", message });
      toast.error("Couldn't load data", { description: message });
    }
  }

  function reload(simulateError = false) {
    abort.current?.abort();
    abort.current = new AbortController();
    setState({ status: "loading" });
    load(abort.current.signal, simulateError);
  }

  useEffect(() => {
    abort.current = new AbortController();
    load(abort.current.signal);
    return () => abort.current?.abort();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backend status</CardTitle>
        <CardDescription>GET /api/health and /api/runs through src/lib/api.ts</CardDescription>
        <CardAction className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => reload(true)}>
            Simulate error
          </Button>
          <Button size="sm" onClick={() => reload()} disabled={state.status === "loading"}>
            Reload
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {/* mode="wait": the old state finishes leaving before the new one enters. */}
        <AnimatePresence mode="wait">
          <motion.div
            key={state.status}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {state.status === "loading" && <LoadingView />}
            {state.status === "error" && <ErrorView message={state.message} onRetry={() => reload()} />}
            {state.status === "success" && <SuccessView health={state.health} runs={state.runs} />}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

function LoadingView() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-3/4" />
    </div>
  );
}

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-lg bg-destructive/10 p-4">
      <p className="text-sm text-destructive">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function SuccessView({ health, runs }: { health: Health; runs: Run[] }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">
        Backend is up · LLM provider: <span className="font-mono">{health.provider}</span>
      </p>
      {runs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No runs yet. Submit something on the home page.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {runs.slice(0, 5).map((run) => (
            <li key={run.id} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
              <span className="font-mono text-muted-foreground">#{run.id}</span>
              <span className="flex-1 truncate">{run.input}</span>
              <RunDialog run={run} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RunDialog({ run }: { run: Run }) {
  return (
    <Dialog>
      {/* Base UI uses `render` (not Radix's `asChild`) to render the trigger as our Button. */}
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>View</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run #{run.id}</DialogTitle>
          <DialogDescription>
            {run.provider} · {new Date(run.created_at).toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm font-medium">{run.input}</p>
        <p className="max-h-64 overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground">{run.output}</p>
      </DialogContent>
    </Dialog>
  );
}
