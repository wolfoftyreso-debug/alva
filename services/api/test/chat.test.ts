import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/secrets.js', () => ({
  getSecret: vi.fn(async () => ({ OPENAI_API_KEY: 'test-key' })),
}));

import { generateReply } from '../src/chat.js';

function openAiResponse(reply: string, analysisReady: boolean) {
  return {
    ok: true,
    json: async () => ({
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({ reply, analysis_ready: analysisReady }),
            },
          ],
        },
      ],
    }),
    text: async () => '',
  };
}

const fetchMock = vi.fn();

beforeEach(() => {
  process.env.KNOWLEDGE_DIR = 'knowledge';
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});

describe('generateReply', () => {
  it('parses structured output and surfaces analysis_ready in free mode', async () => {
    fetchMock.mockResolvedValue(openAiResponse('A transition.', true));
    const result = await generateReply([{ role: 'user', content: 'Hi' }], 'free');
    expect(result).toEqual({ reply: 'A transition.', analysisReady: true });
  });

  it('never reports analysis_ready in premium mode', async () => {
    fetchMock.mockResolvedValue(openAiResponse('Full analysis.', true));
    const result = await generateReply([{ role: 'user', content: 'Hi' }], 'premium');
    expect(result).toEqual({ reply: 'Full analysis.', analysisReady: false });
  });

  it('sends the knowledge base and a strict JSON schema to the Responses API', async () => {
    fetchMock.mockResolvedValue(openAiResponse('Ok.', false));
    await generateReply([{ role: 'user', content: 'Hi' }], 'free');

    const [url, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(url).toBe('https://api.openai.com/v1/responses');
    const payload = JSON.parse(init.body) as {
      instructions: string;
      text: { format: { type: string; strict: boolean } };
    };
    expect(payload.instructions).toContain('Semantika');
    expect(payload.instructions).toContain('Never manufacture suspense');
    expect(payload.instructions).toContain('# Neurosemantics');
    expect(payload.text.format.type).toBe('json_schema');
    expect(payload.text.format.strict).toBe(true);
  });

  it('throws on a non-ok response', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' });
    await expect(generateReply([{ role: 'user', content: 'Hi' }], 'free')).rejects.toThrow(
      'OpenAI request failed',
    );
  });
});
