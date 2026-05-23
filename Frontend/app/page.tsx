"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFlow } from "@/components/flow/FlowProvider";

export default function RootRedirect() {
  const router = useRouter();
  const { state, hydrated } = useFlow();

  useEffect(() => {
    if (!hydrated) return;
    if (!state.authed) router.replace("/welcome");
    else if (!state.preferences) router.replace("/preferences");
    else if (!state.rebuilt) router.replace("/chat");
    else router.replace("/output");
  }, [hydrated, state, router]);

  return (
    <div
      aria-hidden="true"
      className="mx-auto mt-24 max-w-4xl px-6 text-[var(--color-ink-faint)]"
    >
      Loading…
    </div>
  );
}
