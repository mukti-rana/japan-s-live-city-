import type Anthropic from "@anthropic-ai/sdk";

export const CUSTOM_TOOLS: Anthropic.Messages.ToolUnion[] = [
  {
    name: "get_weather",
    description:
      "Get current live weather (temperature, feels-like, humidity, wind, sunrise/sunset, today's high/low) for Tokyo, Osaka, or Kyoto, sourced live from Open-Meteo. Only covers these three cities. For any other Japanese city (Sapporo, Fukuoka, Nagoya, Sendai, etc.), use web_search instead.",
    input_schema: {
      type: "object",
      properties: {
        city: { type: "string", enum: ["tokyo", "osaka", "kyoto"] },
      },
      required: ["city"],
    },
  },
  {
    name: "get_train_status",
    description:
      "Get named train/subway lines for Tokyo, Osaka, or Kyoto. IMPORTANT: this is static placeholder/demo data for UI illustration only — it is NOT live real-time train operator data, since no free real-time Japan train API is connected in this app. You must always state clearly in your answer that this is demo data, not live status. For real current delay/service information, use web_search against the operator's own site or a news source.",
    input_schema: {
      type: "object",
      properties: {
        city: { type: "string", enum: ["tokyo", "osaka", "kyoto"] },
      },
      required: ["city"],
    },
  },
  {
    name: "get_earthquakes",
    description:
      "Get the most recent real earthquakes reported in Japan (location, magnitude, depth, max intensity, tsunami status), relayed from the Japan Meteorological Agency via P2P Quake.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 20, default: 8 },
      },
    },
  },
  {
    name: "get_events",
    description:
      "Get upcoming or ongoing real Japanese festivals and fireworks events, with real recurring dates resolved against today's date. Optionally filter by city or category.",
    input_schema: {
      type: "object",
      properties: {
        city: { type: "string", description: "e.g. Tokyo, Kyoto, Osaka, Nara, Hiroshima, Hokkaido, Gifu, Kanazawa, Okinawa" },
        category: { type: "string", enum: ["Festival", "Fireworks"] },
      },
    },
  },
  {
    name: "get_places",
    description:
      "Get popular real places and landmarks in Japan with a Wikipedia-sourced description. Optionally filter by city/region.",
    input_schema: {
      type: "object",
      properties: {
        city: {
          type: "string",
          enum: ["Tokyo", "Kyoto", "Osaka", "Nara", "Hiroshima", "Hokkaido", "Gifu", "Kanazawa", "Okinawa"],
        },
      },
    },
  },
  {
    name: "get_news",
    description:
      "Get the latest real Japan-related headlines from NHK, The Japan Times, Japan Today, and The Japan News (via RSS).",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 20, default: 8 },
      },
    },
  },
  {
    name: "get_trending",
    description:
      "Get today's most-viewed Japanese Wikipedia topics (real Wikimedia pageview stats) as a proxy for what's currently getting attention in Japan.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 20, default: 10 },
      },
    },
  },
  {
    name: "present_itinerary",
    description:
      "Render a multi-day travel itinerary as a structured, visual card instead of writing it out as prose. Call this whenever the user asks for a day-by-day plan or trip schedule.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "e.g. 'Day 1 — Arrival in Tokyo'" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    time: { type: "string" },
                    title: { type: "string" },
                    note: { type: "string" },
                  },
                  required: ["time", "title"],
                },
              },
            },
            required: ["label", "items"],
          },
        },
      },
      required: ["title", "days"],
    },
  },
];

export const WEB_SEARCH_TOOL: Anthropic.Messages.ToolUnion = {
  type: "web_search_20260209",
  name: "web_search",
  max_uses: 5,
};

export const ALL_TOOLS: Anthropic.Messages.ToolUnion[] = [...CUSTOM_TOOLS, WEB_SEARCH_TOOL];

export const TOOL_LABELS: Record<string, { label: string; icon: string }> = {
  get_weather: { label: "Checking the weather", icon: "🌤️" },
  get_train_status: { label: "Checking train lines", icon: "🚆" },
  get_earthquakes: { label: "Checking recent earthquakes", icon: "🚨" },
  get_events: { label: "Looking up festivals & events", icon: "🎉" },
  get_places: { label: "Looking up places", icon: "🗺️" },
  get_news: { label: "Checking the news", icon: "📰" },
  get_trending: { label: "Checking what's trending", icon: "🔥" },
  present_itinerary: { label: "Putting together your itinerary", icon: "🧳" },
  web_search: { label: "Searching the web", icon: "🔎" },
};
