/**
 * CarAI Lightweight Vector Store
 * 
 * Uses TF-IDF + cosine similarity for semantic search.
 * No external database or embedding API needed — works fully offline.
 * Good enough for codebases up to ~5000 files.
 * 
 * For larger codebases, swap getEmbedding() to call an embedding API.
 */

class VectorStore {
  constructor() {
    this.documents = new Map(); // id → { id, path, content, chunk, tokens, tfidf }
    this.idf = new Map();       // term → idf score
    this.dirty = true;
  }

  // ── Tokenize code intelligently ──────────────────────────
  tokenize(text) {
    return text
      .toLowerCase()
      // Split on non-alphanumeric, but keep underscores as part of identifiers
      .split(/[^a-z0-9_]+/)
      .filter(t => t.length > 1 && t.length < 40)
      // Split camelCase: "myVariable" → ["my", "variable"]
      .flatMap(t => t.split(/(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/))
      .filter(t => t.length > 1);
  }

  // ── TF for a document ────────────────────────────────────
  computeTF(tokens) {
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    const max = Math.max(...tf.values(), 1);
    tf.forEach((v, k) => tf.set(k, v / max));
    return tf;
  }

  // ── Recompute IDF across all docs ────────────────────────
  recomputeIDF() {
    const docCount = this.documents.size;
    const termDocCount = new Map();

    for (const doc of this.documents.values()) {
      const unique = new Set(doc.tokens);
      for (const t of unique) termDocCount.set(t, (termDocCount.get(t) || 0) + 1);
    }

    this.idf.clear();
    for (const [term, count] of termDocCount) {
      this.idf.set(term, Math.log((docCount + 1) / (count + 1)) + 1);
    }
    this.dirty = false;
  }

  // ── TF-IDF vector for a token list ───────────────────────
  tfidfVector(tokens) {
    if (this.dirty) this.recomputeIDF();
    const tf = this.computeTF(tokens);
    const vec = new Map();
    for (const [term, tfScore] of tf) {
      const idfScore = this.idf.get(term) || 0;
      if (idfScore > 0) vec.set(term, tfScore * idfScore);
    }
    return vec;
  }

  // ── Cosine similarity between two TF-IDF vectors ─────────
  cosineSim(vecA, vecB) {
    let dot = 0, normA = 0, normB = 0;
    for (const [t, v] of vecA) {
      dot += v * (vecB.get(t) || 0);
      normA += v * v;
    }
    for (const v of vecB.values()) normB += v * v;
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // ── Add or update a document ──────────────────────────────
  upsert(id, { path, content, chunk = null }) {
    const tokens = this.tokenize(content);
    this.documents.set(id, { id, path, content, chunk, tokens });
    this.dirty = true;
  }

  // ── Remove documents by path ──────────────────────────────
  removeByPath(path) {
    for (const [id, doc] of this.documents) {
      if (doc.path === path) this.documents.delete(id);
    }
    this.dirty = true;
  }

  // ── Search ────────────────────────────────────────────────
  search(query, { topK = 8, minScore = 0.05, excludePaths = [] } = {}) {
    if (this.documents.size === 0) return [];
    if (this.dirty) this.recomputeIDF();

    const qTokens = this.tokenize(query);
    const qVec = this.tfidfVector(qTokens);

    const results = [];
    for (const doc of this.documents.values()) {
      if (excludePaths.includes(doc.path)) continue;
      const docVec = this.tfidfVector(doc.tokens);
      const score = this.cosineSim(qVec, docVec);
      if (score >= minScore) results.push({ ...doc, score });
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  // ── Stats ─────────────────────────────────────────────────
  stats() {
    return { documents: this.documents.size, terms: this.idf.size };
  }

  // ── Clear ─────────────────────────────────────────────────
  clear() {
    this.documents.clear();
    this.idf.clear();
    this.dirty = true;
  }
}

module.exports = new VectorStore(); // singleton
