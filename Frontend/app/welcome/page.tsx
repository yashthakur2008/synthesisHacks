"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Container } from "@/components/layout/Container";
import { StepHeader } from "@/components/layout/StepHeader";
import { Field } from "@/components/form/Field";
import { TextInput } from "@/components/form/TextInput";
import { useFlow } from "@/components/flow/FlowProvider";
import { StatusText } from "@/components/a11y/LiveRegion";

type Mode = "login" | "signup";

export default function WelcomePage() {
  const router = useRouter();
  const { patch } = useFlow();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailErr, setEmailErr] = useState<string | undefined>();
  const [passErr, setPassErr] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailErr(undefined);
    setPassErr(undefined);
    let valid = true;
    if (!email.includes("@")) {
      setEmailErr("Please enter an email address — for example, name@example.com.");
      valid = false;
    }
    if (password.length < 4) {
      setPassErr("Please enter a password with at least 4 characters.");
      valid = false;
    }
    if (!valid) return;

    setBusy(true);
    setStatus("Signing you in…");
    window.setTimeout(() => {
      patch({ authed: true });
      router.push("/preferences");
    }, 500);
  }

  function skip() {
    patch({ authed: true });
    router.push("/preferences");
  }

  return (
    <Container size="sm">
      <StepHeader current="welcome" />
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Welcome to Ditto.
      </h1>
      <p className="mt-5 max-w-prose text-[var(--color-ink-soft)] text-lg leading-relaxed">
        Ditto helps make websites easier to read, safer to navigate, and more
        accessible for everyone. Tell us a little about how you read, and we’ll
        rebuild any page to suit you.
      </p>

      <div
        role="tablist"
        aria-label="Sign in or sign up"
        className="mt-12 inline-flex gap-1 rounded-[var(--radius-md)] border border-[var(--color-rule)] bg-white p-1"
      >
        {(["login", "signup"] as Mode[]).map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-[var(--radius-sm)] px-5 py-2 text-sm font-semibold transition ${active ? "bg-[var(--color-paper-soft)] text-[var(--color-ink)]" : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}
            >
              {m === "login" ? "Sign in" : "Create account"}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5" noValidate>
        <Field
          label="Email address"
          description="We only use this to remember your settings."
          required
          error={emailErr}
        >
          {(ids) => (
            <TextInput
              id={ids.inputId}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby={ids["aria-describedby"]}
              aria-invalid={ids["aria-invalid"]}
            />
          )}
        </Field>
        <Field
          label="Password"
          description={
            mode === "signup"
              ? "Choose something memorable, at least 4 characters."
              : "The password you use for Ditto."
          }
          required
          error={passErr}
        >
          {(ids) => (
            <TextInput
              id={ids.inputId}
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={ids["aria-describedby"]}
              aria-invalid={ids["aria-invalid"]}
            />
          )}
        </Field>

        <div className="mt-2 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            className="btn-primary"
            disabled={busy}
          >
            {busy ? "One moment…" : mode === "login" ? "Continue" : "Create my account"}
          </button>
          <button
            type="button"
            onClick={skip}
            className="btn-quiet underline-offset-4 hover:underline"
          >
            Skip and explore
          </button>
        </div>
        <StatusText>{status}</StatusText>
      </form>
    </Container>
  );
}
