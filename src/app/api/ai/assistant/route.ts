import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, type AssistantMode } from "@/lib/ai/systemPrompt";
import { ALL_TOOLS } from "@/lib/ai/tools";
import { executeTool, INTERNAL_TOOL_SOURCES } from "@/lib/ai/executeTool";
import { writeNdjson } from "@/lib/ai/ndjsonStream";
import { DEFAULT_LANGUAGE } from "@/lib/ai/languages";
import type { ChatMessage, WebSourceLink } from "@/lib/ai/types";

export const runtime = "nodejs";

const MAX_ITERATIONS = 8;
const MAX_TOKENS = 6144;

interface RequestBody {
  messages?: ChatMessage[];
  language?: string;
  mode?: AssistantMode;
  image?: { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" };
}

const VALID_MODES: AssistantMode[] = ["chat", "explain-japanese", "sign-assistant"];

function dedupeByUrl(links: WebSourceLink[]): WebSourceLink[] {
  const seen = new Set<string>();
  const out: WebSourceLink[] = [];
  for (const link of links) {
    if (seen.has(link.url)) continue;
    seen.add(link.url);
    out.push(link);
  }
  return out;
}

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0 || messages[messages.length - 1]?.role !== "user") {
    return Response.json({ error: "At least one user message is required." }, { status: 400 });
  }

  const language =
    typeof body.language === "string" && body.language.trim() ? body.language : DEFAULT_LANGUAGE;
  const mode: AssistantMode = VALID_MODES.includes(body.mode as AssistantMode)
    ? (body.mode as AssistantMode)
    : "chat";

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      {
        error:
          "LIVE CITY AI isn't configured yet. Add ANTHROPIC_API_KEY to .env.local and restart the dev server to enable it.",
      },
      { status: 503 },
    );
  }

  const client = new Anthropic();

  // Plain-text history only — no persisted tool_use/tool_result blocks across turns.
  let workingMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Attach an image (if any) to only the final, current user turn.
  const image = body.image;
  if (image && workingMessages.length > 0) {
    const lastIndex = workingMessages.length - 1;
    const last = workingMessages[lastIndex];
    if (last.role === "user" && typeof last.content === "string") {
      workingMessages[lastIndex] = {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } },
          { type: "text", text: last.content },
        ],
      };
    }
  }

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const usedInternalTools = new Set<string>();
      const webResults: WebSourceLink[] = [];
      let iterations = 0;

      try {
        for (;;) {
          if (++iterations > MAX_ITERATIONS) {
            writeNdjson(controller, {
              type: "error",
              message: "This took too many steps — try rephrasing your question.",
            });
            break;
          }

          const stream = client.messages.stream({
            model: "claude-sonnet-5",
            max_tokens: MAX_TOKENS,
            system: buildSystemPrompt(language, mode),
            tools: mode === "chat" ? ALL_TOOLS : [],
            messages: workingMessages,
          });

          const pendingServerTools: { id: string; name: string }[] = [];

          stream.on("text", (delta) => {
            writeNdjson(controller, { type: "text", delta });
          });

          stream.on("streamEvent", (event) => {
            if (event.type !== "content_block_start") return;
            const block = event.content_block;
            if (block.type === "tool_use") {
              writeNdjson(controller, { type: "tool_start", tool: block.name, id: block.id });
            } else if (block.type === "server_tool_use") {
              writeNdjson(controller, { type: "tool_start", tool: block.name, id: block.id });
              pendingServerTools.push({ id: block.id, name: block.name });
            }
          });

          const message = await stream.finalMessage();

          for (const t of pendingServerTools) {
            writeNdjson(controller, { type: "tool_end", tool: t.name, id: t.id });
          }

          workingMessages = [...workingMessages, { role: "assistant", content: message.content }];

          for (const block of message.content) {
            if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
              for (const r of block.content) {
                if ("title" in r && "url" in r) {
                  webResults.push({ title: r.title, url: r.url });
                }
              }
            }
          }

          if (message.stop_reason === "end_turn") {
            const internalSources = [...usedInternalTools].map((tool) => ({
              tool,
              label: INTERNAL_TOOL_SOURCES[tool]?.label ?? tool,
              isLive: INTERNAL_TOOL_SOURCES[tool]?.isLive ?? true,
            }));
            const dedupedWeb = dedupeByUrl(webResults);
            if (dedupedWeb.length || internalSources.length) {
              writeNdjson(controller, {
                type: "card",
                card: { kind: "sources", data: { webResults: dedupedWeb, internalSources } },
              });
            }
            writeNdjson(controller, { type: "done" });
            break;
          }

          if (message.stop_reason === "pause_turn") {
            continue;
          }

          if (message.stop_reason === "tool_use") {
            const toolUseBlocks = message.content.filter(
              (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
            );

            const toolResults = await Promise.all(
              toolUseBlocks.map(async (tool) => {
                const { result, card } = await executeTool(tool.name, tool.input as Record<string, unknown>);
                if (card) writeNdjson(controller, { type: "card", card });
                if (tool.name !== "present_itinerary") usedInternalTools.add(tool.name);
                writeNdjson(controller, { type: "tool_end", tool: tool.name, id: tool.id });
                return {
                  type: "tool_result" as const,
                  tool_use_id: tool.id,
                  content: JSON.stringify(result),
                };
              }),
            );

            workingMessages = [...workingMessages, { role: "user", content: toolResults }];
            continue;
          }

          // max_tokens / stop_sequence / anything else — stop gracefully.
          writeNdjson(controller, { type: "done" });
          break;
        }
      } catch (err) {
        console.error("[ai/assistant] stream loop error:", err);
        const detail =
          err instanceof Anthropic.AuthenticationError
            ? "The configured API key was rejected."
            : err instanceof Anthropic.RateLimitError
              ? "LIVE CITY AI is rate limited right now. Try again shortly."
              : err instanceof Anthropic.APIError
                ? `LIVE CITY AI's request failed (${err.status}): ${err.message}`
                : err instanceof Error
                  ? `Something went wrong talking to LIVE CITY AI: ${err.message}`
                  : "Something went wrong talking to LIVE CITY AI.";
        writeNdjson(controller, { type: "error", message: detail });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}
