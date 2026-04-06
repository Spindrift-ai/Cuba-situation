import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Chatbot requires ANTHROPIC_API_KEY. Get one free at console.anthropic.com and add it to your environment variables.",
      },
      { status: 503 }
    );
  }

  try {
    const { messages, context } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages array required" },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey });

    const systemPrompt = `You are a Cuba situation analyst embedded in a live monitoring dashboard. You have access to real-time data feeds shown below. Answer questions concisely and analytically, like an intelligence briefer. Use the live data provided — never fabricate data points.

LIVE DASHBOARD STATE:
${context || "No data currently loaded."}

Guidelines:
- Be concise — this is a mobile dashboard, not an essay
- When citing data, reference the source (OpenSky, Polymarket, etc.)
- If data is missing or a feed is down, say so honestly
- For Polymarket probabilities, note they reflect market sentiment, not certainty
- For military/surveillance aircraft, flag them prominently
- Use markdown formatting: **bold** for emphasis, bullet points for lists`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ response: text });
  } catch (err) {
    const msg = String(err);
    if (msg.includes("401") || msg.includes("authentication")) {
      return NextResponse.json(
        { error: "Invalid ANTHROPIC_API_KEY. Check your environment variables." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: `Chat error: ${msg.substring(0, 200)}` },
      { status: 500 }
    );
  }
}
