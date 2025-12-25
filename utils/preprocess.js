import { removeStopwords } from "stopword";

export default function preprocess(text) {
  return removeStopwords(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
  ).join(" ");
}
