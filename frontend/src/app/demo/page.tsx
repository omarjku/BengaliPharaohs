// Reference page for the UI building blocks: shadcn/ui + Motion + a backend fetch.
// Server Component: only the interactive parts below are Client Components.
import type { Metadata } from "next";
import { DemoTabs } from "./demo-tabs";

export const metadata: Metadata = { title: "UI demo · Hack-Nation" };

export default function DemoPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-16">
      <header className="flex flex-col gap-2">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Building blocks</span>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">UI demo</h1>
        <p className="text-muted-foreground">
          Motion patterns and a fetch with loading and error states. Copy from here into the real screens.
        </p>
      </header>
      <DemoTabs />
    </main>
  );
}
