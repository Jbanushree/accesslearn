# Accessify

AI-powered web app that converts academic content (PDFs, scanned images, text, lecture audio) into accessible multimodal formats: extracted text via OCR, simplified versions tuned to a reading level, TTS audio narration, structured captions/sign-language chunks, and a faculty interface that audits accessibility and applies one-click fixes.

## Architecture

- **Monorepo**: pnpm workspaces. Two artifacts share a single PostgreSQL database and an OpenAPI-driven typed contract.
- **Frontend** (`artifacts/accessify`): React + Vite + TypeScript, wouter routing, TanStack Query, shadcn/ui, Tailwind, Recharts, Framer Motion. Pages: Dashboard, Library, Upload, Document Detail (Read/Listen/Captions/Accessibility tabs).
- **Backend** (`artifacts/api-server`): Express + TypeScript. Routes mounted under `/api`: documents CRUD, simplify, audio (TTS), captions, analyze, auto-fix, transcribe, stats, activity, healthz.
- **Database** (`lib/db`): Drizzle ORM. Tables: `documents` (rich JSONB columns for issues, captions, key terms), `activity` (audit log).
- **API contract** (`lib/api-spec`): Single OpenAPI 3.0 source of truth → Orval generates typed React Query hooks (`lib/api-client-react`) and Zod validators (`lib/api-zod`).
- **AI integration** (`lib/integrations-openai-ai-server`, `lib/integrations-openai-ai-react`): OpenAI client via Replit AI Integrations proxy (no user-supplied API key). Models used: `gpt-5.4` for OCR, simplification, captioning, and accessibility analysis; `gpt-4o-mini-transcribe` for audio transcription; OpenAI TTS for audio narration.

## Notable design decisions

- Document creation returns immediately; OCR/transcription/initial analysis run in a fire-and-forget background task. Status transitions `processing → ready | failed`.
- Audio is stored as base64 data URLs directly in Postgres (single-tenant demo simplicity; easy to swap to object storage).
- `lib/api-zod/src/index.ts` re-exports types explicitly to avoid name collisions between Orval's auto-generated request-body Zod schemas (in `generated/api.ts`) and matching TS types (in `generated/types/`).
- Accessibility issues, captions, and key terms are stored as JSONB so the schema stays stable while content evolves.
- The Auto-fix endpoint generates a high-school simplified version + structured captions when missing, then marks all existing issues as fixed and bumps the score floor — a real, demonstrable improvement loop.

## Environment

- `DATABASE_URL` — Postgres connection (provisioned).
- `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY` — set by the OpenAI Replit AI integration; never user-supplied.
- `SESSION_SECRET` — present but unused (no auth in this iteration).

## Running locally

Workflows started by Replit:
- `artifacts/api-server: API Server` → backend on the api-server port, mounted at `/api`.
- `artifacts/accessify: web` → Vite dev server, accessible at `/`.

After OpenAPI spec changes: `pnpm --filter @workspace/api-spec run codegen`.
After schema changes: `pnpm --filter @workspace/db run push`.
