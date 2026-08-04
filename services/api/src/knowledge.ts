import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

let cached: string | undefined;

/**
 * The knowledge base is a set of Markdown files bundled with the Lambda.
 * They are concatenated and injected as system instructions. RAG (selective
 * retrieval) can replace this later without changing the API surface.
 */
export function loadKnowledgeBase(): string {
  if (cached !== undefined) return cached;
  const dir = process.env.KNOWLEDGE_DIR ?? join(import.meta.dirname, '..', 'knowledge');
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort();
  cached = files.map((f) => readFileSync(join(dir, f), 'utf-8')).join('\n\n---\n\n');
  return cached;
}
