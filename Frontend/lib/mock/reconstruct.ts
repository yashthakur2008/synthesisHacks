import type { Analysis, Preferences, Rebuilt } from "../types";
import { newsFixture, newsRebuilt, productRebuilt } from "./fixtures";

export function reconstruct(
  analysis: Analysis,
  _preferences: Preferences | null,
  _intent: string,
): Promise<Rebuilt> {
  const base =
    analysis.pageTitle === newsFixture.pageTitle ? newsRebuilt : productRebuilt;
  return new Promise((resolve) => {
    setTimeout(() => resolve(base), 1100);
  });
}
