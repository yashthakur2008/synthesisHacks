export type Step = "welcome" | "preferences" | "chat" | "output";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** When the assistant message reports an analysis, the structured findings travel with it. */
  findings?: Analysis;
  /** When the assistant offers to create the improved version, render an inline CTA. */
  offerRebuild?: boolean;
};

export type VisionNeed =
  | "screen-reader"
  | "high-contrast"
  | "larger-text"
  | "reduced-motion"
  | "alt-text-descriptions";

export type HearingNeed = "captions" | "transcripts" | "visual-cues";

export type DyslexiaSupport = "none" | "low" | "medium" | "high";

export type ReadingComplexity = 1 | 2 | 3 | 4 | 5;

export type Preferences = {
  name: string;
  country: string;
  vision: VisionNeed[];
  hearing: HearingNeed[];
  dyslexia: DyslexiaSupport;
  complexity: ReadingComplexity;
  childSafe: boolean;
  simplifyLanguage: boolean;
};

export type Finding = {
  id: string;
  label: string;
  description: string;
};

export type Analysis = {
  url: string;
  pageTitle: string;
  readability: {
    level: "easy" | "moderate" | "difficult";
    gradeApprox: number;
    note: string;
  };
  missingA11y: Finding[];
  structureIssues: Finding[];
  barriers: Finding[];
};

export type RebuiltView = {
  title: string;
  body: RebuiltBlock[];
};

export type RebuiltBlock =
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "callout"; tone: "info" | "warm" | "grow"; text: string }
  | { kind: "media"; label: string; caption: string };

export type Improvement = {
  id: string;
  category: "readability" | "a11y" | "structure";
  summary: string;
};

export type Rebuilt = {
  views: {
    original: RebuiltView;
    simplified: RebuiltView;
    screenReader: RebuiltView;
  };
  improvements: Improvement[];
  readabilityDelta: {
    before: number;
    after: number;
    note: string;
  };
};

export type FlowState = {
  authed: boolean;
  preferences: Preferences | null;
  source: { mode: "url" | "capture"; url?: string } | null;
  analysis: Analysis | null;
  intent: string;
  messages: ChatMessage[];
  rebuilt: Rebuilt | null;
};

export const defaultPreferences: Preferences = {
  name: "",
  country: "",
  vision: [],
  hearing: [],
  dyslexia: "none",
  complexity: 3,
  childSafe: false,
  simplifyLanguage: false,
};

export const initialFlow: FlowState = {
  authed: false,
  preferences: null,
  source: null,
  analysis: null,
  intent: "",
  messages: [],
  rebuilt: null,
};
