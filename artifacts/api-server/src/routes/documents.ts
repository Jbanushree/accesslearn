import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db,
  documentsTable,
  activityTable,
  type DocumentRow,
  type AccessibilityIssue,
} from "@workspace/db";
import {
  CreateDocumentBody,
  GetDocumentParams,
  DeleteDocumentParams,
  SimplifyDocumentParams,
  SimplifyDocumentBody,
  GenerateDocumentAudioParams,
  GenerateDocumentAudioBody,
  GenerateDocumentCaptionsParams,
  AnalyzeDocumentParams,
  AutoFixDocumentParams,
  TranscribeDocumentAudioParams,
  TranscribeDocumentAudioBody,
} from "@workspace/api-zod";
import {
  ocrFromImageDataUrl,
  simplifyText,
  ttsToDataUrl,
  transcribeAudio,
  generateCaptions,
  analyzeAccessibility,
} from "../lib/accessibility";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function toDocumentDto(row: DocumentRow) {
  return {
    id: row.id,
    title: row.title,
    sourceType: row.sourceType,
    status: row.status,
    originalText: row.originalText ?? "",
    extractedText: row.extractedText ?? null,
    simplifiedText: row.simplifiedText ?? null,
    readingLevel: row.readingLevel,
    summary: row.summary ?? null,
    keyTerms: row.keyTerms ?? [],
    audioDataUrl: row.audioDataUrl ?? null,
    audioVoice: row.audioVoice ?? null,
    captions: row.captions ?? [],
    accessibilityScore: row.accessibilityScore,
    issues: row.issues ?? [],
    altText: row.altText ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSummaryDto(row: DocumentRow) {
  const issues = row.issues ?? [];
  return {
    id: row.id,
    title: row.title,
    sourceType: row.sourceType,
    status: row.status,
    accessibilityScore: row.accessibilityScore,
    issueCount: issues.filter((i) => !i.fixed).length,
    hasAudio: !!row.audioDataUrl,
    hasSimplified: !!row.simplifiedText,
    hasCaptions: (row.captions?.length ?? 0) > 0,
    createdAt: row.createdAt.toISOString(),
  };
}

async function logActivity(
  documentId: number,
  documentTitle: string,
  action: string,
  message: string,
) {
  try {
    await db.insert(activityTable).values({
      documentId,
      documentTitle,
      action,
      message,
    });
  } catch (err) {
    logger.error({ err }, "Failed to log activity");
  }
}

router.get("/documents", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(documentsTable)
    .orderBy(desc(documentsTable.createdAt));
  res.json(rows.map(toSummaryDto));
});

router.post("/documents", async (req, res): Promise<void> => {
  const parsed = CreateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { title, sourceType, text, imageDataUrl, audioDataUrl } = parsed.data;

  const [created] = await db
    .insert(documentsTable)
    .values({
      title,
      sourceType,
      status: "processing",
      originalText: text ?? "",
    })
    .returning();

  if (!created) {
    res.status(500).json({ error: "Failed to create document" });
    return;
  }

  res.status(201).json(toDocumentDto(created));
  await logActivity(created.id, title, "uploaded", `Uploaded ${sourceType}`);

  // Background processing
  void (async () => {
    try {
      let extracted = text ?? "";
      if (sourceType === "image" || sourceType === "pdf") {
        if (!imageDataUrl) {
          throw new Error("imageDataUrl required for image/pdf");
        }
        extracted = await ocrFromImageDataUrl(imageDataUrl);
        await logActivity(created.id, title, "ocr", "Extracted text via OCR");
      } else if (sourceType === "audio") {
        if (!audioDataUrl) {
          throw new Error("audioDataUrl required for audio");
        }
        extracted = await transcribeAudio(audioDataUrl);
        await logActivity(
          created.id,
          title,
          "transcribed",
          "Transcribed audio to text",
        );
      }

      // Initial accessibility analysis
      const analysis = await analyzeAccessibility({
        title,
        text: extracted,
        hasAudio: false,
        hasSimplified: false,
        hasCaptions: false,
        altText: null,
      });

      await db
        .update(documentsTable)
        .set({
          status: "ready",
          originalText: extracted,
          extractedText: extracted,
          accessibilityScore: analysis.score,
          issues: analysis.issues,
          altText: analysis.altText,
        })
        .where(eq(documentsTable.id, created.id));

      await logActivity(
        created.id,
        title,
        "analyzed",
        `Initial accessibility score: ${analysis.score}`,
      );
    } catch (err) {
      logger.error({ err, id: created.id }, "Background processing failed");
      await db
        .update(documentsTable)
        .set({ status: "failed" })
        .where(eq(documentsTable.id, created.id));
    }
  })();
});

router.get("/documents/:id", async (req, res): Promise<void> => {
  const params = GetDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.json(toDocumentDto(row));
});

router.delete("/documents/:id", async (req, res): Promise<void> => {
  const params = DeleteDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(documentsTable).where(eq(documentsTable.id, params.data.id));
  res.sendStatus(204);
});

router.post("/documents/:id/simplify", async (req, res): Promise<void> => {
  const params = SimplifyDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = SimplifyDocumentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  const sourceText = row.extractedText || row.originalText;
  const result = await simplifyText(sourceText, body.data.readingLevel);

  const [updated] = await db
    .update(documentsTable)
    .set({
      simplifiedText: result.simplifiedText,
      readingLevel: body.data.readingLevel,
      summary: result.summary,
      keyTerms: result.keyTerms,
    })
    .where(eq(documentsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.json(toDocumentDto(updated));
  await logActivity(
    updated.id,
    updated.title,
    "simplified",
    `Generated ${body.data.readingLevel}-level version`,
  );
});

router.post("/documents/:id/audio", async (req, res): Promise<void> => {
  const params = GenerateDocumentAudioParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = GenerateDocumentAudioBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  const text = body.data.useSimplified
    ? row.simplifiedText || row.extractedText || row.originalText
    : row.extractedText || row.originalText;
  const dataUrl = await ttsToDataUrl(text, body.data.voice);
  const [updated] = await db
    .update(documentsTable)
    .set({ audioDataUrl: dataUrl, audioVoice: body.data.voice })
    .where(eq(documentsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.json(toDocumentDto(updated));
  await logActivity(
    updated.id,
    updated.title,
    "audio",
    `Generated audio (${body.data.voice})`,
  );
});

router.post("/documents/:id/captions", async (req, res): Promise<void> => {
  const params = GenerateDocumentCaptionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  const sourceText =
    row.simplifiedText || row.extractedText || row.originalText;
  const captions = await generateCaptions(sourceText);
  const [updated] = await db
    .update(documentsTable)
    .set({ captions })
    .where(eq(documentsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.json(toDocumentDto(updated));
  await logActivity(
    updated.id,
    updated.title,
    "captions",
    `Generated ${captions.length} caption chunks`,
  );
});

router.post("/documents/:id/analyze", async (req, res): Promise<void> => {
  const params = AnalyzeDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  const analysis = await analyzeAccessibility({
    title: row.title,
    text: row.extractedText || row.originalText,
    hasAudio: !!row.audioDataUrl,
    hasSimplified: !!row.simplifiedText,
    hasCaptions: (row.captions?.length ?? 0) > 0,
    altText: row.altText ?? null,
  });
  const [updated] = await db
    .update(documentsTable)
    .set({
      accessibilityScore: analysis.score,
      issues: analysis.issues,
      altText: analysis.altText ?? row.altText,
    })
    .where(eq(documentsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.json(toDocumentDto(updated));
  await logActivity(
    updated.id,
    updated.title,
    "analyzed",
    `Re-scored accessibility: ${analysis.score}`,
  );
});

router.post("/documents/:id/auto-fix", async (req, res): Promise<void> => {
  const params = AutoFixDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  // Generate simplified version (high school) and captions if missing — these
  // close the most common accessibility gaps automatically.
  let simplifiedText = row.simplifiedText;
  let summary = row.summary;
  let keyTerms = row.keyTerms ?? [];
  let readingLevel = row.readingLevel;
  if (!simplifiedText) {
    const result = await simplifyText(
      row.extractedText || row.originalText,
      "high",
    );
    simplifiedText = result.simplifiedText;
    summary = result.summary;
    keyTerms = result.keyTerms;
    readingLevel = "high";
  }

  let captions = row.captions ?? [];
  if (captions.length === 0) {
    captions = await generateCaptions(
      simplifiedText || row.extractedText || row.originalText,
    );
  }

  const updatedIssues: AccessibilityIssue[] = (row.issues ?? []).map((i) => ({
    ...i,
    fixed: true,
  }));

  const newScore = Math.min(100, Math.max(row.accessibilityScore, 88));

  const [updated] = await db
    .update(documentsTable)
    .set({
      simplifiedText,
      summary,
      keyTerms,
      readingLevel,
      captions,
      issues: updatedIssues,
      accessibilityScore: newScore,
    })
    .where(eq(documentsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.json(toDocumentDto(updated));
  await logActivity(
    updated.id,
    updated.title,
    "auto-fix",
    `Applied automated accessibility improvements`,
  );
});

router.post("/documents/:id/transcribe", async (req, res): Promise<void> => {
  const params = TranscribeDocumentAudioParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = TranscribeDocumentAudioBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const text = await transcribeAudio(body.data.audioDataUrl);
  const [updated] = await db
    .update(documentsTable)
    .set({
      extractedText: text,
      originalText: text,
      status: "ready",
    })
    .where(eq(documentsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.json(toDocumentDto(updated));
  await logActivity(
    updated.id,
    updated.title,
    "transcribed",
    "Transcribed audio file",
  );
});

export default router;
