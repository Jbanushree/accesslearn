import { openai } from "@workspace/integrations-openai-ai-server";
import { textToSpeech } from "@workspace/integrations-openai-ai-server/audio";
import type {
  AccessibilityIssue,
  KeyTerm,
  ReadingLevel,
  StructuredChunk,
} from "@workspace/db";
import { randomUUID } from "node:crypto";

const TEXT_MODEL = "gpt-5.4";

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

function detectMimeFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;,]+)[;,]/i);
  return match?.[1]?.toLowerCase() ?? "";
}

function dataUrlToBuffer(dataUrl: string): Buffer {
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx === -1) return Buffer.from("");
  const meta = dataUrl.slice(0, commaIdx);
  const data = dataUrl.slice(commaIdx + 1);
  if (meta.includes(";base64")) return Buffer.from(data, "base64");
  return Buffer.from(decodeURIComponent(data), "utf-8");
}

async function extractTextFromPdf(dataUrl: string): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const buf = dataUrlToBuffer(dataUrl);
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [text];
  return pages
    .map((p, i) => `## Page ${i + 1}\n\n${(p ?? "").trim()}`)
    .filter((s) => s.trim().length > 0)
    .join("\n\n---\n\n");
}

export async function ocrFromImageDataUrl(
  imageDataUrl: string,
): Promise<string> {
  const mime = detectMimeFromDataUrl(imageDataUrl);
  const isPdf = mime === "application/pdf";

  if (isPdf) {
    const extracted = await extractTextFromPdf(imageDataUrl);
    if (extracted.trim().length > 0) return extracted;
    return "[No selectable text found in this PDF — it may be a scanned/image-only document.]";
  }

  const response = await openai.chat.completions.create({
    model: TEXT_MODEL,
    max_completion_tokens: 8192,
    messages: [
      {
        role: "system",
        content:
          "You are an OCR engine for academic content. Extract ALL readable text from the image, preserving structure: headings as Markdown headings, paragraphs as paragraphs, lists as Markdown lists, tables as Markdown tables. If the image contains a diagram or figure, also write a clear textual description after the extracted text under a heading '## Figure description'. Return only the extracted text — no commentary.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract the text and structure from this academic page or figure.",
          },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
  });
  return response.choices[0]?.message?.content ?? "";
}

const READING_LEVEL_INSTRUCTIONS: Record<ReadingLevel, string> = {
  elementary:
    "Rewrite for an elementary-school reader (grade 4-5). Very short sentences. Common words. Define jargon inline in plain language. Keep the meaning intact.",
  middle:
    "Rewrite for a middle-school reader (grade 7-8). Short, clear sentences. Replace jargon with simpler terms but keep one occurrence of the original term in parentheses on first use.",
  high: "Rewrite for a high-school reader (grade 10). Clear modern English. Keep technical terms but break long sentences into shorter ones. Add brief inline clarifications for unusual words.",
  original: "Return the text unchanged.",
};

export async function simplifyText(
  text: string,
  level: ReadingLevel,
): Promise<{
  simplifiedText: string;
  summary: string;
  keyTerms: KeyTerm[];
}> {
  if (level === "original" || !text.trim()) {
    return { simplifiedText: text, summary: "", keyTerms: [] };
  }

  const response = await openai.chat.completions.create({
    model: TEXT_MODEL,
    max_completion_tokens: 8192,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are an accessibility editor for academic content. Produce a simplified version, a one-paragraph plain-language summary, and a list of 3-8 key terms with simple definitions. Respond with strict JSON in this exact shape: {"simplifiedText": string, "summary": string, "keyTerms": [{"term": string, "definition": string}]}. ${READING_LEVEL_INSTRUCTIONS[level]}`,
      },
      {
        role: "user",
        content: `Original text:\n\n${text.slice(0, 12000)}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  return safeJsonParse(raw, {
    simplifiedText: text,
    summary: "",
    keyTerms: [] as KeyTerm[],
  });
}

export async function ttsToDataUrl(
  text: string,
  voice: string,
): Promise<string> {
  const allowed = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
  const v = (allowed.includes(voice) ? voice : "alloy") as
    | "alloy"
    | "echo"
    | "fable"
    | "onyx"
    | "nova"
    | "shimmer";
  const buf = await textToSpeech(text.slice(0, 4000), v, "mp3");
  const base64 = buf.toString("base64");
  return `data:audio/mpeg;base64,${base64}`;
}

export async function transcribeAudio(audioDataUrl: string): Promise<string> {
  const match = audioDataUrl.match(/^data:audio\/([a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid audio data URL");
  }
  const mime = match[1] ?? "mpeg";
  const base64 = match[2] ?? "";
  const buffer = Buffer.from(base64, "base64");
  const ext =
    mime.includes("wav")
      ? "wav"
      : mime.includes("mp3") || mime.includes("mpeg")
        ? "mp3"
        : mime.includes("m4a") || mime.includes("mp4")
          ? "m4a"
          : mime.includes("ogg")
            ? "ogg"
            : mime.includes("webm")
              ? "webm"
              : "mp3";

  const file = new File([new Uint8Array(buffer)], `audio.${ext}`, {
    type: `audio/${mime}`,
  });

  const result = await openai.audio.transcriptions.create({
    file,
    model: "gpt-4o-mini-transcribe",
  });
  return result.text;
}

export async function generateCaptions(
  text: string,
): Promise<StructuredChunk[]> {
  if (!text.trim()) return [];

  const response = await openai.chat.completions.create({
    model: TEXT_MODEL,
    max_completion_tokens: 8192,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Split the input into 8-20 caption chunks suitable for sign-language interpretation and on-screen captions. Each chunk has: a concise heading (or null), the chunk text (one short sentence or clause), a 'signLanguageGloss' (an ASL-style gloss using uppercase keywords and minimal grammatical fillers), and synthetic timing. Estimate timing using ~150 words per minute starting at 0ms. Return strict JSON of the exact shape: {\"chunks\": [{\"index\": number, \"heading\": string|null, \"text\": string, \"signLanguageGloss\": string|null, \"startMs\": number, \"endMs\": number}]}. Do not invent content not in the source.",
      },
      { role: "user", content: text.slice(0, 9000) },
    ],
  });
  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = safeJsonParse<{ chunks?: StructuredChunk[] }>(raw, { chunks: [] });
  return (parsed.chunks ?? []).map((c, i) => ({
    index: i,
    heading: c.heading ?? null,
    text: String(c.text ?? ""),
    signLanguageGloss: c.signLanguageGloss ?? null,
    startMs: Number(c.startMs ?? 0),
    endMs: Number(c.endMs ?? 0),
  }));
}

export async function analyzeAccessibility(args: {
  title: string;
  text: string;
  hasAudio: boolean;
  hasSimplified: boolean;
  hasCaptions: boolean;
  altText: string | null;
}): Promise<{
  score: number;
  issues: AccessibilityIssue[];
  altText: string | null;
}> {
  if (!args.text.trim()) {
    return {
      score: 0,
      issues: [
        {
          id: randomUUID(),
          severity: "critical",
          category: "Empty content",
          message: "No text content was extracted from this material.",
          suggestion:
            "Re-upload a clearer scan or paste the text directly so it can be made accessible.",
          fixed: false,
        },
      ],
      altText: null,
    };
  }

  const response = await openai.chat.completions.create({
    model: TEXT_MODEL,
    max_completion_tokens: 8192,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an accessibility auditor for higher-education materials, applying WCAG 2.2 and academic accessibility best practices. Analyze the provided document text and metadata, then return strict JSON: {\"score\": number 0-100, \"altText\": string|null, \"issues\": [{\"severity\": \"critical\"|\"warning\"|\"info\", \"category\": string, \"message\": string, \"suggestion\": string}]}. Look for: missing/poor heading structure, dense paragraphs, undefined jargon, lack of plain-language summary, missing alt text for any figure references, missing captions/audio for spoken content, inconsistent terminology, low-contrast assumptions, screen-reader unfriendly tables. Output 4-8 high-quality issues. The 'altText' field should be a short alt-text suggestion if the content references figures or images, otherwise null. Score: 95-100 = excellent, 80-94 = good, 60-79 = needs work, <60 = critical gaps.",
      },
      {
        role: "user",
        content: `Title: ${args.title}\nHas audio narration: ${args.hasAudio}\nHas simplified version: ${args.hasSimplified}\nHas timed captions/structured chunks: ${args.hasCaptions}\nExisting alt text: ${args.altText ?? "(none)"}\n\nDocument text:\n${args.text.slice(0, 9000)}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = safeJsonParse<{
    score?: number;
    altText?: string | null;
    issues?: Array<Omit<AccessibilityIssue, "id" | "fixed">>;
  }>(raw, { score: 50, issues: [] });

  const issues: AccessibilityIssue[] = (parsed.issues ?? []).map((it) => ({
    id: randomUUID(),
    severity: it.severity ?? "info",
    category: String(it.category ?? "General"),
    message: String(it.message ?? ""),
    suggestion: String(it.suggestion ?? ""),
    fixed: false,
  }));

  return {
    score: Math.max(0, Math.min(100, Math.round(parsed.score ?? 50))),
    issues,
    altText: parsed.altText ?? null,
  };
}
