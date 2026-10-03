"use client";

// Three Motion patterns, one card each:
// 1. animate: change the target values and Motion animates to them.
// 2. AnimatePresence: lets elements play an exit animation before React removes them.
// 3. layout: Motion animates size/position changes caused by normal CSS layout.
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function MotionDemo() {
  return (
    <div className="flex flex-col gap-4">
      <AnimateExample />
      <PresenceExample />
      <LayoutExample />
    </div>
  );
}

function AnimateExample() {
  const [on, setOn] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle>animate</CardTitle>
        <CardDescription>Toggle the target; Motion springs between the two states.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-6">
        <Button onClick={() => setOn((v) => !v)}>{on ? "Reset" : "Animate"}</Button>
        <motion.div
          className="size-12 rounded-xl bg-primary"
          animate={on ? { x: 120, rotate: 90, borderRadius: "50%" } : { x: 0, rotate: 0, borderRadius: "12px" }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        />
      </CardContent>
    </Card>
  );
}

type Item = { id: number; text: string };

function PresenceExample() {
  const [items, setItems] = useState<Item[]>([
    { id: 1, text: "First item" },
    { id: 2, text: "Second item" },
  ]);
  const [text, setText] = useState("");
  const [nextId, setNextId] = useState(3);

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setItems((prev) => [{ id: nextId, text: text.trim() }, ...prev]);
    setNextId((n) => n + 1);
    setText("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AnimatePresence</CardTitle>
        <CardDescription>Add items, click one to remove it. Removed items fade out before leaving.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form onSubmit={add} className="flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="New item…" />
          <Button type="submit">Add</Button>
        </form>
        <ul className="flex flex-col gap-2">
          {/* initial={false}: items already on screen at first render don't animate in. */}
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                  className="w-full rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  {item.text}
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </CardContent>
    </Card>
  );
}

function LayoutExample() {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader>
        <CardTitle>layout</CardTitle>
        <CardDescription>The box grows with plain CSS; the layout prop animates the change.</CardDescription>
      </CardHeader>
      <CardContent>
        <motion.button
          layout
          onClick={() => setOpen((v) => !v)}
          className={`flex flex-col gap-2 overflow-hidden rounded-xl bg-muted p-4 text-left ${open ? "w-full" : "w-40"}`}
          style={{ borderRadius: 12 }} // set in style so Motion can correct it while scaling
        >
          <motion.span layout="position" className="font-medium">
            {open ? "Click to collapse" : "Click to expand"}
          </motion.span>
          {open && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground">
              Extra detail appears here. Use this pattern for an answer card that opens to show its evidence.
            </motion.p>
          )}
        </motion.button>
      </CardContent>
    </Card>
  );
}
