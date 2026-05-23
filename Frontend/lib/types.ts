export type Step = "welcome" | "preferences" | "chat" | "output";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
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
  /** Optional self-reported age. Backend uses this to tune language complexity. */
  age: number | null;
  vision: VisionNeed[];
  hearing: HearingNeed[];
  dyslexia: DyslexiaSupport;
  complexity: ReadingComplexity;
  childSafe: boolean;
  simplifyLanguage: boolean;
};

export type Rebuilt = {
  /** Raw HTML from the backend `/transform` endpoint, rendered via iframe srcdoc. */
  transformedHtml: string;
  /** Original page URL, used for "view original" link-out. */
  originalUrl: string;
  /** Which backend profile we sent — kept for the summary panel. */
  profileApplied: { disability: string; age: number };
};

export type FlowState = {
  authed: boolean;
  preferences: Preferences | null;
  source: { mode: "url" | "capture"; url?: string } | null;
  /** Legacy mock field, kept on state for now so existing localStorage stays compatible. */
  analysis: unknown | null;
  intent: string;
  messages: ChatMessage[];
  rebuilt: Rebuilt | null;
};

export const defaultPreferences: Preferences = {
  name: "",
  country: "",
  age: null,
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
