import { useRoute } from "wouter";
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  useGetSharedDocument,
  getGetSharedDocumentQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Headphones,
  Captions,
  AlertTriangle,
  Play,
  Pause,
  Type,
} from "lucide-react";

export default function Shared() {
  const [, params] = useRoute("/shared/:token");
  const token = params?.token ?? "";
  const { data, isLoading, error } = useGetSharedDocument(token, {
    query: {
      enabled: !!token,
      queryKey: getGetSharedDocumentQueryKey(token),
    },
  });

  const [dyslexia, setDyslexia] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      void audioRef.current.play();
    }
    setPlaying(!playing);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-6 py-16 space-y-6">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <div className="space-y-3 pt-8">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-serif font-bold text-foreground">
            This shared material isn't available
          </h1>
          <p className="text-muted-foreground mt-2">
            The link may have expired, the document may have been deleted, or
            the URL might be incorrect.
          </p>
        </div>
      </div>
    );
  }

  const fontFamily = dyslexia
    ? '"Comic Sans MS", "Trebuchet MS", system-ui, sans-serif'
    : "var(--font-serif, Georgia, serif)";
  const lineHeight = dyslexia ? 2 : 1.8;
  const letterSpacing = dyslexia ? "0.04em" : "normal";

  return (
    <div className="min-h-screen bg-background">
      {/* Public-view header — distinct from the workspace nav */}
      <header className="border-b bg-card/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <BookOpen className="w-5 h-5" />
            <span className="font-serif text-lg font-semibold">Accessify</span>
            <Badge variant="outline" className="ml-2 text-[10px] uppercase tracking-wide">
              Shared reader
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={dyslexia ? "default" : "outline"}
              onClick={() => setDyslexia(!dyslexia)}
              className="gap-1.5 h-8"
            >
              <Type className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dyslexia font</span>
            </Button>
            <div className="hidden sm:flex items-center gap-1 border rounded-md">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2"
                onClick={() => setFontScale(Math.max(0.85, fontScale - 0.1))}
              >
                A-
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2"
                onClick={() => setFontScale(Math.min(1.6, fontScale + 0.1))}
              >
                A+
              </Button>
            </div>
          </div>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-3xl mx-auto px-6 py-12 space-y-10"
      >
        <div>
          <Badge variant="outline" className="mb-3 capitalize">
            {data.sourceType}
            {data.readingLevel !== "original" && (
              <span className="ml-1 opacity-60">
                · {data.readingLevel} level
              </span>
            )}
          </Badge>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-primary tracking-tight leading-tight">
            {data.title}
          </h1>
        </div>

        {data.summary && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="text-xs uppercase tracking-wider text-primary/70 mb-2 font-semibold">
                Summary
              </div>
              <p className="text-foreground/90 leading-relaxed">
                {data.summary}
              </p>
            </CardContent>
          </Card>
        )}

        {data.audioDataUrl && (
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <Button size="icon" onClick={togglePlay} className="rounded-full h-12 w-12 shrink-0">
                {playing ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Headphones className="w-4 h-4" /> Audio narration
                </div>
                <audio
                  ref={audioRef}
                  src={data.audioDataUrl}
                  controls
                  className="w-full mt-2"
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onEnded={() => setPlaying(false)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <article
          style={{
            fontFamily,
            lineHeight,
            letterSpacing,
            fontSize: `${fontScale}rem`,
          }}
          className="prose prose-lg max-w-none text-foreground whitespace-pre-wrap"
        >
          {data.readingText}
        </article>

        {data.keyTerms.length > 0 && (
          <section className="space-y-3 pt-4 border-t">
            <h2 className="font-serif text-xl font-semibold text-primary">
              Key terms
            </h2>
            <dl className="grid sm:grid-cols-2 gap-3">
              {data.keyTerms.map((kt) => (
                <div
                  key={kt.term}
                  className="rounded-md border bg-card/50 p-4"
                >
                  <dt className="font-semibold text-foreground">{kt.term}</dt>
                  <dd className="text-sm text-muted-foreground mt-1">
                    {kt.definition}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {data.captions.length > 0 && (
          <section className="space-y-3 pt-4 border-t">
            <h2 className="font-serif text-xl font-semibold text-primary flex items-center gap-2">
              <Captions className="w-5 h-5" /> Captions
            </h2>
            <ol className="space-y-2">
              {data.captions.map((c) => (
                <li
                  key={c.index}
                  className="rounded-md border bg-card/50 p-3 text-sm"
                >
                  {c.heading && (
                    <div className="font-semibold text-foreground mb-1">
                      {c.heading}
                    </div>
                  )}
                  <div className="text-foreground/90">{c.text}</div>
                  {c.signLanguageGloss && (
                    <div className="mt-1 text-xs uppercase tracking-wide text-primary/70">
                      {c.signLanguageGloss}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        <footer className="pt-12 border-t text-center text-xs text-muted-foreground">
          Made accessible with Accessify
        </footer>
      </motion.main>
    </div>
  );
}
