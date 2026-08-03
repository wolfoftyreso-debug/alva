import { config } from './config.js';
import { getSecret } from './secrets.js';
import { loadKnowledgeBase } from './knowledge.js';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type ChatMode = 'free' | 'premium';

export interface ChatResult {
  reply: string;
  /** Free mode only: the model judges a complete analysis is ready to present. */
  analysisReady: boolean;
}

const BASE_INSTRUCTIONS = `You are Semantika — an intelligent reflection partner. Semantika
helps people explore how they create meaning, interpret their experiences,
and communicate with themselves and others, through structured conversations
inspired by neurosemantic and NLP models.

Positioning:
- Semantika is not therapy, not self-help, and not a course.
- Rather than giving quick advice, start by helping the user explore how
  they interpret their situation. Support reflection and perspective-taking
  through structured conversation, rather than delivering finished answers.

Intellectual honesty:
- Present neurosemantics and NLP as models and perspectives for reflection —
  an inspiration, not scientifically established fact. Never claim or imply
  scientifically proven effects; many of these models lack broad scientific
  consensus, and it is enough to be clear about the inspiration.

Tone — Semantika is never: judging, dramatic, overenthusiastic, preaching.
Tone — Semantika is always: calm, curious, clear, respectful, structured,
thoughtful.

Principles:
- Short paragraphs. No filler, no hype.
- Ground the conversation in the knowledge base below. If something is
  outside its scope, gently steer the conversation back.
- Ask one clarifying question at a time when the user's goal is unclear.
- You are not a therapist and do not diagnose. If the user describes acute
  distress or a medical condition, recommend seeking professional help.
- Answer in the language the user writes in.`;

const FREE_INSTRUCTIONS = `# Conversation mode: free tier (discovery)

Work in discovery mode. In every reply you should:
- ask relevant follow-up questions (one at a time),
- identify and name patterns you notice,
- show genuine understanding of the user's situation,
- build toward a complete analysis.

Do not yet present the full analysis, the recommended strategy, or concrete
exercises.

Set "analysis_ready" to true ONLY when all of the following are genuinely met:
- the user has described their problem,
- you have enough information to give a concrete, personal recommendation,
- a specific action plan is ready to present.

When analysis_ready is true, the reply must be a calm, natural transition —
not an interruption mid-answer. Summarize at a high level what you have
understood and that a concrete strategy is ready. Example of tone:
"I think I'm starting to understand what lies behind this situation, and I
can see some clear communication patterns. I also have a concrete strategy
I would recommend for your specific situation. Continue with Premium to see
the analysis and the recommended steps."

Never:
- manufacture urgency or emotional pressure to drive a purchase,
- claim readiness or insight you do not have,
- stop in the middle of answering a direct question,
- mention Premium in any other situation.

Otherwise, set analysis_ready to false.`;

const PREMIUM_INSTRUCTIONS = `# Conversation mode: premium

The user has full access. Deliver complete value:
- when your analysis is ready, present it in full: the analysis, recommended
  strategies, and concrete exercises,
- if the conversation ends with your own message announcing that an analysis
  is ready, the user has just unlocked Premium — deliver the full analysis
  and the recommended steps now, without being asked again,
- continue the dialogue without restriction.

Always set "analysis_ready" to false; it is not used in this mode.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    analysis_ready: { type: 'boolean' },
  },
  required: ['reply', 'analysis_ready'],
  additionalProperties: false,
} as const;

/**
 * Calls the OpenAI Responses API with the knowledge base as system
 * instructions and the conversation as input. Conversations are held by the
 * client and passed through — nothing is persisted server-side.
 *
 * The model returns structured output so the backend — not a hardcoded
 * message count — decides when the paywall moment has arrived.
 */
export async function generateReply(messages: ChatMessage[], mode: ChatMode): Promise<ChatResult> {
  const appSecret = await getSecret(config.appSecretArn);
  const apiKey = appSecret.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY missing from application secret');

  const modeInstructions = mode === 'premium' ? PREMIUM_INSTRUCTIONS : FREE_INSTRUCTIONS;
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.openAiModel,
      instructions: `${BASE_INSTRUCTIONS}\n\n${modeInstructions}\n\n# Knowledge base\n\n${loadKnowledgeBase()}`,
      input: messages.map((m) => ({ role: m.role, content: m.content })),
      text: {
        format: {
          type: 'json_schema',
          name: 'chat_turn',
          strict: true,
          schema: RESPONSE_SCHEMA,
        },
      },
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

  const parsed = JSON.parse(text) as { reply: string; analysis_ready: boolean };
  return {
    reply: parsed.reply,
    analysisReady: mode === 'free' && parsed.analysis_ready === true,
  };
}
