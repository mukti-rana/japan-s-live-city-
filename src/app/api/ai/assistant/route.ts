import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, type AssistantMode } from "@/lib/ai/systemPrompt";
import { ALL_TOOLS } from "@/lib/ai/tools";
import { executeTool, INTERNAL_TOOL_SOURCES } from "@/lib/ai/executeTool";
import { writeNdjson } from "@/lib/ai/ndjsonStream";
import { DEFAULT_LANGUAGE, isLanguageCode } from "@/lib/ai/languages";
import { AI_LIMITS, GUEST_LIMIT, MEMBER_LIMIT, clientKey, takeToken, validateAssistantBody } from "@/lib/ai/guard";
import { isSameOrigin, json } from "@/lib/community/http";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { WebSourceLink } from "@/lib/ai/types";

export const runtime = "nodejs";

const MAX_ITERATIONS = 8;
const MAX_TOKENS = 6144;

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
  // 1. Only this website may call it (a request from another site, or none, is refused).
  if (!isSameOrigin(req)) return json({ error: "This request isn't allowed." }, 403);

  // 2. Not absurdly large (the body is read as text so the size is checked even without a Content-Length).
  if (Number(req.headers.get("content-length") ?? 0) > AI_LIMITS.maxBodyBytes) return json({ error: "That request is too large." }, 413);
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }
  if (raw.length > AI_LIMITS.maxBodyBytes) return json({ error: "That request is too large." }, 413);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  // 3. The right shape and size (message count and length, image kind and size).
  const checked = validateAssistantBody(parsed);
  if (!checked.ok) return json({ error: checked.error }, checked.status);
  const { messages, image } = checked.value;
  const language = isLanguageCode(checked.value.language) ? checked.value.language : DEFAULT_LANGUAGE;
  const mode: AssistantMode = VALID_MODES.includes(checked.value.mode as AssistantMode) ? (checked.value.mode as AssistantMode) : "chat";

  // 4. Switched off when there is no key (checked before anything is counted).
  if (!process.env.ANTHROPIC_API_KEY) {
    return json(
      {
        error:
          "Coming soon — LIVE CITY AI is turned off right now. The rest of the site — weather, trains, news, events and maps — works as normal.",
      },
      503,
    );
  }

  // 5. A fair share for everyone: signed-in people get more than guests (see lib/ai/guard.ts).
  let userId: string | null = null;
  if (isSupabaseConfigured) {
    try {
      const { data } = await (await createClient()).auth.getUser();
      userId = data.user?.id ?? null;
    } catch {
      userId = null;
    }
  }
  const wait = takeToken(clientKey(req.headers, userId), userId ? MEMBER_LIMIT : GUEST_LIMIT);
  if (wait > 0) {
    return json({ error: "You're asking quickly — please wait a moment and try again." }, 429, { "Retry-After": String(wait) });
  }

  const client = new Anthropic();

  // Plain-text history only — no persisted tool_use/tool_result blocks across turns.
  let workingMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Attach an image (if any) to only the final, current user turn.
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
