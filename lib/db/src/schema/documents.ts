import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export type SourceType = "pdf" | "image" | "text" | "audio";
export type DocumentStatus = "processing" | "ready" | "failed";
export type ReadingLevel = "elementary" | "middle" | "high" | "original";

export type AccessibilityIssue = {
  id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  message: string;
  suggestion: string;
  fixed: boolean;
};

export type StructuredChunk = {
  index: number;
  heading: string | null;
  text: string;
  signLanguageGloss: string | null;
  startMs: number;
  endMs: number;
};

export type KeyTerm = {
  term: string;
  definition: string;
};

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  sourceType: text("source_type").$type<SourceType>().notNull(),
  status: text("status").$type<DocumentStatus>().notNull().default("processing"),
  originalText: text("original_text").notNull().default(""),
  extractedText: text("extracted_text"),
  simplifiedText: text("simplified_text"),
  readingLevel: text("reading_level").$type<ReadingLevel>().notNull().default("original"),
  summary: text("summary"),
  keyTerms: jsonb("key_terms").$type<KeyTerm[]>().notNull().default([]),
  audioDataUrl: text("audio_data_url"),
  audioVoice: text("audio_voice"),
  captions: jsonb("captions").$type<StructuredChunk[]>().notNull().default([]),
  accessibilityScore: integer("accessibility_score").notNull().default(0),
  issues: jsonb("issues").$type<AccessibilityIssue[]>().notNull().default([]),
  altText: text("alt_text"),
  shareToken: text("share_token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type DocumentRow = typeof documentsTable.$inferSelect;
export type InsertDocumentRow = typeof documentsTable.$inferInsert;
