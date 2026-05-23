"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { StepHeader } from "@/components/layout/StepHeader";
import { CheckboxGroup } from "@/components/form/CheckboxGroup";
import { Checkbox } from "@/components/form/Checkbox";
import { RadioGroup } from "@/components/form/RadioGroup";
import { Scale } from "@/components/form/Scale";
import { Toggle } from "@/components/form/Toggle";
import { Field } from "@/components/form/Field";
import { TextInput } from "@/components/form/TextInput";
import { StepGuard } from "@/components/flow/StepGuard";
import { useFlow } from "@/components/flow/FlowProvider";
import {
  defaultPreferences,
  type DyslexiaSupport,
  type HearingNeed,
  type Preferences,
  type ReadingComplexity,
  type VisionNeed,
} from "@/lib/types";

const visionOptions: { value: VisionNeed; label: string; description: string }[] = [
  {
    value: "screen-reader",
    label: "I use a screen reader",
    description: "Pages will be structured for the best screen-reader experience.",
  },
  {
    value: "high-contrast",
    label: "I prefer higher contrast",
    description: "Text and surfaces will use stronger contrast.",
  },
  {
    value: "larger-text",
    label: "I prefer larger text",
    description: "Body text will be larger and spaced more generously.",
  },
  {
    value: "reduced-motion",
    label: "I prefer reduced motion",
    description: "Animations and transitions will be turned off.",
  },
  {
    value: "alt-text-descriptions",
    label: "Describe images in detail",
    description: "Images will get longer, more descriptive text alternatives.",
  },
];

const hearingOptions: { value: HearingNeed; label: string; description: string }[] = [
  {
    value: "captions",
    label: "Add captions to videos",
    description: "Spoken words will appear as text on the video.",
  },
  {
    value: "transcripts",
    label: "Provide transcripts",
    description: "Full text version of audio and video, so you can read it.",
  },
  {
    value: "visual-cues",
    label: "Add visual cues",
    description: "Important sounds and alerts will also show as visuals.",
  },
];

const dyslexiaOptions: { value: DyslexiaSupport; label: string; description: string }[] = [
  { value: "none", label: "Not needed", description: "Standard typography and pacing." },
  {
    value: "low",
    label: "A little",
    description: "Slightly wider letter and line spacing.",
  },
  {
    value: "medium",
    label: "Moderate",
    description: "Wider spacing, shorter line length, plain language.",
  },
  {
    value: "high",
    label: "Strong support",
    description:
      "Maximum spacing, very short lines, sentences kept simple and chunked.",
  },
];

export default function PreferencesPage() {
  return (
    <StepGuard require="preferences">
      <PreferencesContent />
    </StepGuard>
  );
}

function PreferencesContent() {
  const router = useRouter();
  const { state, set } = useFlow();
  const [prefs, setPrefs] = useState<Preferences>(() => ({
    ...defaultPreferences,
    ...(state.preferences ?? {}),
  }));
  const [nameErr, setNameErr] = useState<string | undefined>();
  const [countryErr, setCountryErr] = useState<string | undefined>();

  useEffect(() => {
    if (state.preferences) {
      setPrefs({ ...defaultPreferences, ...state.preferences });
    }
  }, [state.preferences]);

  function toggle<T extends string>(arr: T[], value: T): T[] {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
  }

  function submit() {
    let valid = true;
    if (!prefs.name.trim()) {
      setNameErr("Please tell us what to call you.");
      valid = false;
    } else {
      setNameErr(undefined);
    }
    if (!prefs.country.trim()) {
      setCountryErr("Please add the country you're in.");
      valid = false;
    } else {
      setCountryErr(undefined);
    }
    if (!valid) return;
    set("preferences", { ...prefs, name: prefs.name.trim(), country: prefs.country.trim() });
    router.push("/chat");
  }

  return (
    <Container size="md">
      <StepHeader current="preferences" />
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        How do you like to read?
      </h1>
      <p className="mt-4 max-w-prose text-[var(--color-ink-soft)] text-lg leading-relaxed">
        Pick what feels right. You can change any of these later, and none of
        your answers leave your device.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-12 flex flex-col gap-12"
        noValidate
      >
        <section
          aria-labelledby="about-you"
          className="flex flex-col gap-5"
        >
          <h2
            id="about-you"
            className="font-[family-name:var(--font-display)] text-[var(--color-ink)] text-lg font-semibold"
          >
            About you
          </h2>
          <p className="-mt-3 text-[var(--color-ink-muted)] text-sm leading-relaxed">
            Just a couple of basics so Ditto can greet you and adapt to where
            you read from.
          </p>
          <Field
            label="What should we call you?"
            description="A first name or nickname is fine."
            required
            error={nameErr}
          >
            {(ids) => (
              <TextInput
                id={ids.inputId}
                type="text"
                autoComplete="given-name"
                value={prefs.name}
                onChange={(e) => setPrefs({ ...prefs, name: e.target.value })}
                aria-describedby={ids["aria-describedby"]}
                aria-invalid={ids["aria-invalid"]}
              />
            )}
          </Field>
          <Field
            label="Where are you reading from?"
            description="Country or region — this helps with language and local context."
            required
            error={countryErr}
          >
            {(ids) => (
              <TextInput
                id={ids.inputId}
                type="text"
                autoComplete="country-name"
                value={prefs.country}
                onChange={(e) =>
                  setPrefs({ ...prefs, country: e.target.value })
                }
                aria-describedby={ids["aria-describedby"]}
                aria-invalid={ids["aria-invalid"]}
              />
            )}
          </Field>
        </section>

        <CheckboxGroup
          legend="Vision"
          description="Choose any that apply. Leave blank if none do."
        >
          {visionOptions.map((opt) => (
            <Checkbox
              key={opt.value}
              label={opt.label}
              description={opt.description}
              checked={prefs.vision.includes(opt.value)}
              onChange={() =>
                setPrefs({ ...prefs, vision: toggle(prefs.vision, opt.value) })
              }
            />
          ))}
        </CheckboxGroup>

        <CheckboxGroup
          legend="Hearing"
          description="If a page has audio or video, we’ll adapt it for you."
        >
          {hearingOptions.map((opt) => (
            <Checkbox
              key={opt.value}
              label={opt.label}
              description={opt.description}
              checked={prefs.hearing.includes(opt.value)}
              onChange={() =>
                setPrefs({ ...prefs, hearing: toggle(prefs.hearing, opt.value) })
              }
            />
          ))}
        </CheckboxGroup>

        <RadioGroup<DyslexiaSupport>
          legend="Dyslexia support"
          description="How much should we adapt typography and language for dyslexic readers?"
          value={prefs.dyslexia}
          options={dyslexiaOptions}
          onChange={(v) => setPrefs({ ...prefs, dyslexia: v })}
        />

        <Scale
          legend="How simple should the writing feel?"
          description="1 means very simple. 5 means original complexity."
          min={1}
          max={5}
          minLabel="Very simple"
          maxLabel="Standard"
          value={prefs.complexity}
          onChange={(v) =>
            setPrefs({ ...prefs, complexity: v as ReadingComplexity })
          }
        />

        <div className="grid gap-4">
          <Toggle
            label="Child-safe mode"
            description="Filter out adult themes, violence, and unsafe content."
            checked={prefs.childSafe}
            onChange={(v) => setPrefs({ ...prefs, childSafe: v })}
          />
          <Toggle
            label="Plain-language mode"
            description="Rewrite jargon and complicated phrasing into everyday words."
            checked={prefs.simplifyLanguage}
            onChange={(v) => setPrefs({ ...prefs, simplifyLanguage: v })}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-[var(--color-rule)] pt-8">
          <button type="submit" className="btn-primary">
            Save and continue
          </button>
          <p className="text-[var(--color-ink-muted)] text-sm">
            You can change these any time from the top of the page.
          </p>
        </div>
      </form>
    </Container>
  );
}
