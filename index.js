import express from "express";
import fs from "fs/promises";
import pkg from "natural";

import preprocess from "./utils/preprocess.js";

const { TfIdf } = pkg;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("."));

let problems = [];
let tfidf = new TfIdf();

// store each document’s tf-idf vector and its magnitude
let docVectors = [];
let docMagnitudes = [];
let invertedIndex = new Map();

async function loadProblemsAndBuildIndex() {
  const data = await fs.readFile("./corpus/all_problems.json", "utf-8");
  problems = JSON.parse(data);

  tfidf = new TfIdf();
  invertedIndex = new Map();// Reset index

  // 1. Add documents to TF-IDF
  problems.forEach((problem, idx) => {
    const text = preprocess(
      `${problem.title} ${problem.title} ${problem.description || ""}`
    );
    tfidf.addDocument(text, idx.toString());
  });

  // 2. Build Vectors, Magnitudes, AND Inverted Index
  docVectors = [];
  docMagnitudes = [];
  
  problems.forEach((_, idx) => {
    const vector = {};
    let sumSquares = 0;

    // tfidf.listTerms(idx) gives us every word in this specific document
    tfidf.listTerms(idx).forEach(({ term, tfidf: weight }) => {
      // Build Vector
      vector[term] = weight;
      sumSquares += weight * weight;

      // Build Inverted Index
      if (!invertedIndex.has(term)) {
        invertedIndex.set(term, []);
      }
      invertedIndex.get(term).push({ docId: idx });
    });

    docVectors[idx] = vector;
    docMagnitudes[idx] = Math.sqrt(sumSquares);
  });

  console.log("Index built. Total terms:", Object.keys(invertedIndex).length);
}

app.post("/search", async (req, res) => {
  const rawQuery = req.body.query;

  if (!rawQuery || typeof rawQuery !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'query'" });
  }

  // Preprocess query
  const query = preprocess(rawQuery);
  const tokens = query.split(" ").filter(Boolean);

  if (tokens.length === 0) {
    return res.json({ results: [] });
  }

  // 1. Find Candidate Documents (The Optimization)
  // Instead of looping through all 3500 problems, we find which docs have these words.
  const candidateIds = new Set();
  
  tokens.forEach((token) => {
    if (invertedIndex.has(token)) {
      invertedIndex.get(token).forEach((entry) => {
        candidateIds.add(entry.docId);
      });
    }
  });

  if (candidateIds.size === 0) {
    return res.json({ results: [] });
  }

  // 2. Build Query Vector
  const termFreq = {};
  tokens.forEach((t) => {
    termFreq[t] = (termFreq[t] || 0) + 1;
  });

  const queryVector = {};
  let sumSqQ = 0;
  const N = tokens.length;
  
  Object.entries(termFreq).forEach(([term, count]) => {
    const tf = count / N;
    const idf = tfidf.idf(term);
    const w = tf * idf;
    queryVector[term] = w;
    sumSqQ += w * w;
  });
  const queryMag = Math.sqrt(sumSqQ) || 1;

  // 3. Score ONLY the Candidate Documents
  const scores = Array.from(candidateIds).map((idx) => {
    const docVec = docVectors[idx];
    const docMag = docMagnitudes[idx] || 1;
    let dot = 0;

    for (const [term, wq] of Object.entries(queryVector)) {
      if (docVec[term]) {
        dot += wq * docVec[term];
      }
    }

    const cosine = dot / (queryMag * docMag);
    return { idx, score: cosine };
  });

  // 4. Sort and Return Top 10
  const top = scores
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ idx }) => {
      const p = problems[idx];
      const platform = p.url.includes("leetcode.com")
        ? "LeetCode"
        : "Codeforces";
      return { ...p, platform };
    });

  res.json({ results: top });
});

loadProblemsAndBuildIndex().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
