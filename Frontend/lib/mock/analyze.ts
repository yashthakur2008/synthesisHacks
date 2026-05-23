import type { Analysis } from "../types";
import { newsFixture, productFixture } from "./fixtures";

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function analyze(url: string): Promise<Analysis> {
  const trimmed = url.trim();
  const fixture = hash(trimmed) % 2 === 0 ? newsFixture : productFixture;
  const result: Analysis = { ...fixture, url: trimmed };

  return new Promise((resolve) => {
    setTimeout(() => resolve(result), 900);
  });
}
