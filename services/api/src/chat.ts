import { config } from './config.js';
import { getSecret } from './secrets.js';
import { loadKnowledgeBase } from './knowledge.js';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const BASE_INSTRUCTIONS = `You are NeuroSemantics AI — a calm, precise conversation partner
specialized in neurosemantics and NLP (Neuro-Linguistic Programming).

Principles:
- Be warm but restrained. Short paragraphs. No filler, no hype.
- Ground answers in the knowledge base below. If something is outside
  neurosemantics/NLP, gently steer the conversation back.
- Ask one clarifying question at a time when the user's goal is unclear.
- You are not a therapist and do not diagnose. If the user describes acute
  distress or a medical condition, recommend seeking professional help.
- Answer in the language the user writes in.`;

/**
 * Calls the OpenAI Responses API with the knowledge base as system
 * instructions and the conversation as input. Conversations are held by the
 * client and passed through — nothing is persisted server-side.
 */
export async function generateReply(messages: ChatMessage[]): Promise<string> {
  const appSecret = await getSecret(config.appSecretArn);
  const apiKey = appSecret.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY missing from application secret');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.openAiModel,
      instructions: `${BASE_INSTRUCTIONS}\n\n# Knowledge base\n\n${loadKnowledgeBase()}`,
      input: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    output?: { type: string; content?: { type: string; text?: string }[] }[];
  };
  const text = (data.output ?? [])
    .filter((item) => item.type === 'message')
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === 'output_text')
    .map((part) => part.text ?? '')
    .join('');

  if (!text) throw new Error('OpenAI response contained no output text');
  return text;
}
