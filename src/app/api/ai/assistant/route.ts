import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are the Japan AI Assistant inside Live City Japan, an app that helps foreigners, students, and workers living in Japan. A user will describe something they need to say or understand in a daily-life Japanese context (work, school, travel, forms, etc.).

Respond in exactly this format, with nothing before or after it:

###POLITE_JAPANESE###
<a natural, polite Japanese sentence or short message expressing what the user needs to say, using teineigo or keigo as appropriate>
###HIRAGANA###
<the same sentence rewritten entirely in hiragana, with natural spacing between words/phrases>
###ENGLISH###
<a natural English translation, plus one short sentence of context or advice only if genuinely useful>

Keep each section to a sentence or two. Do not add headings, labels, markdown, or commentary outside the three sections.`;

export async function POST(req: Request) {
  let message: unknown;
  try {
    ({ message } = await req.json());
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof message !== "string" || !message.trim()) {
    return Response.json({ error: "Message is required." }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      {
        error:
          "The AI Assistant isn't configured yet. Add ANTHROPIC_API_KEY to .env.local and restart the dev server.",
      },
      { status: 503 },
    );
  }

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: "claude-sonnet-5",
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: message as string }],
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        const detail =
          err instanceof Anthropic.AuthenticationError
            ? "The configured API key was rejected."
            : err instanceof Anthropic.RateLimitError
              ? "The AI Assistant is rate limited right now. Try again shortly."
              : "Something went wrong talking to the AI Assistant.";
        controller.enqueue(encoder.encode(`\n###ERROR###\n${detail}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
