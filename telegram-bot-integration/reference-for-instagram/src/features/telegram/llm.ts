import "server-only";
import { DeepSeekError } from "@/lib/deepseek-error";

/**
 * Chat-completion helper for the Telegram bot (intent extraction and
 * conversation memory). DeepSeek is the only model that reads the text and
 * chooses products; Groq is used solely for voice transcription (`groq.ts`).
 */

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-flash";
const DEEPSEEK_TIMEOUT_MS = 30_000;

type CompletionParams = {
  system: string;
  user: string;
  json?: boolean;
  maxTokens: number;
};

export async function completeChat(p: CompletionParams): Promise<string> {
  try {
    return await completeChatOnce(p);
  } catch (error) {
    // A dropped/reset connection (not an HTTP error) is usually a stale
    // keep-alive socket — one immediate retry gets a fresh one.
    if (error instanceof DeepSeekError && error.message === "fetch failed") {
      return completeChatOnce(p);
    }
    throw error;
  }
}

async function completeChatOnce(p: CompletionParams): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new DeepSeekError("config", "DEEPSEEK_API_KEY is not set");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT_MS);
  try {
    const response = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        temperature: 0,
        max_tokens: p.maxTokens,
        thinking: { type: "disabled" },
        ...(p.json
          ? { response_format: { type: "json_object" as const } }
          : {}),
        messages: [
          { role: "system", content: p.system },
          { role: "user", content: p.user },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new DeepSeekError(
        "api",
        `DeepSeek responded ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`,
      );
    }
    const payload = (await response.json()) as {
      choices?: { message?: { content?: unknown } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new DeepSeekError("empty", "DeepSeek returned no content");
    }
    return content;
  } catch (error) {
    if (error instanceof DeepSeekError) throw error;
    throw new DeepSeekError(
      "api",
      error instanceof Error ? error.message : "request failed",
    );
  } finally {
    clearTimeout(timeout);
  }
}
