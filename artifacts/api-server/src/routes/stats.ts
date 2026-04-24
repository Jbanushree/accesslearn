import { Router, type IRouter } from "express";
import { desc, gte, sql } from "drizzle-orm";
import { db, documentsTable, activityTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/stats", async (_req, res): Promise<void> => {
  const all = await db.select().from(documentsTable);
  const total = all.length;
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thisWeek = all.filter((d) => d.createdAt >= oneWeekAgo).length;
  const avg =
    total === 0
      ? 0
      : Math.round(
          all.reduce((s, d) => s + d.accessibilityScore, 0) / total,
        );
  const issuesFixed = all.reduce(
    (s, d) => s + (d.issues ?? []).filter((i) => i.fixed).length,
    0,
  );

  const sourceTypes: Record<string, number> = {
    pdf: 0,
    image: 0,
    text: 0,
    audio: 0,
  };
  for (const d of all) {
    sourceTypes[d.sourceType] = (sourceTypes[d.sourceType] ?? 0) + 1;
  }

  const buckets = [
    { bucket: "0-49", min: 0, max: 49 },
    { bucket: "50-69", min: 50, max: 69 },
    { bucket: "70-84", min: 70, max: 84 },
    { bucket: "85-100", min: 85, max: 100 },
  ];
  const scoreDistribution = buckets.map((b) => ({
    bucket: b.bucket,
    count: all.filter(
      (d) => d.accessibilityScore >= b.min && d.accessibilityScore <= b.max,
    ).length,
  }));

  res.json({
    totalDocuments: total,
    documentsThisWeek: thisWeek,
    averageAccessibilityScore: avg,
    totalIssuesFixed: issuesFixed,
    documentsBySourceType: (
      ["pdf", "image", "text", "audio"] as const
    ).map((sourceType) => ({
      sourceType,
      count: sourceTypes[sourceType] ?? 0,
    })),
    scoreDistribution,
  });
});

router.get("/activity", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(activityTable)
    .orderBy(desc(activityTable.createdAt))
    .limit(20);
  res.json(
    rows.map((r) => ({
      id: r.id,
      documentId: r.documentId,
      documentTitle: r.documentTitle,
      action: r.action,
      message: r.message,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

export default router;
