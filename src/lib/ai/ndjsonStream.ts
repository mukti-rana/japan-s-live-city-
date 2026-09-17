import type { StreamEvent } from "@/lib/ai/types";

const encoder = new TextEncoder();

export function writeNdjson(controller: ReadableStreamDefaultController<Uint8Array>, event: StreamEvent) {
  controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
}

export async function* readNdjsonStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<StreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      yield JSON.parse(line) as StreamEvent;
    }
  }

  if (buffer.trim()) {
    yield JSON.parse(buffer) as StreamEvent;
  }
}
