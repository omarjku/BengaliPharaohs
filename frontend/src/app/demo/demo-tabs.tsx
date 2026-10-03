"use client";

import { MotionConfig } from "motion/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FetchDemo } from "./fetch-demo";
import { MotionDemo } from "./motion-demo";

export function DemoTabs() {
  return (
    // reducedMotion="user": animations are skipped for people who turned motion off in their OS.
    <MotionConfig reducedMotion="user">
      <Tabs defaultValue="motion">
        <TabsList>
          <TabsTrigger value="motion">Motion</TabsTrigger>
          <TabsTrigger value="fetch">Fetch</TabsTrigger>
        </TabsList>
        <TabsContent value="motion" className="pt-4">
          <MotionDemo />
        </TabsContent>
        <TabsContent value="fetch" className="pt-4">
          <FetchDemo />
        </TabsContent>
      </Tabs>
    </MotionConfig>
  );
}
