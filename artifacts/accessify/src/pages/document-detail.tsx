import { useState } from "react";
import { useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  useGetDocument, 
  useSimplifyDocument, 
  useGenerateDocumentAudio, 
  useGenerateDocumentCaptions, 
  useAnalyzeDocument, 
  useAutoFixDocument, 
  useTranscribeDocumentAudio,
  getGetDocumentQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  BookOpen, Headphones, Captions, ShieldAlert, Sparkles, AlertTriangle, 
  CheckCircle, Info, FileAudio, FileText, Loader2, Copy, Play, Pause, Share2, ExternalLink
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAccessibility } from "@/lib/accessibility-provider";

export default function DocumentDetail() {
  const [, params] = useRoute("/document/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  
  const queryClient = useQueryClient();
  const { data: document, isLoading, error } = useGetDocument(id, { query: { enabled: !!id } });
  
  const simplifyMutation = useSimplifyDocument();
  const generateAudioMutation = useGenerateDocumentAudio();
  const generateCaptionsMutation = useGenerateDocumentCaptions();
  const analyzeMutation = useAnalyzeDocument();
  const autoFixMutation = useAutoFixDocument();
  const transcribeMutation = useTranscribeDocumentAudio();

  const [activeTab, setActiveTab] = useState("read");
  const [dyslexiaMode, setDyslexiaMode] = useState(false);
  const [localFontSize, setLocalFontSize] = useState([100]);
  const [readingLevel, setReadingLevel] = useState<"original" | "high" | "middle" | "elementary">("original");
  const [voice, setVoice] = useState<string>("alloy");
  const [useSimplifiedForAudio, setUseSimplifiedForAudio] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <Skeleton className="h-12 w-3/4" />
        <div className="flex gap-4 mb-8">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="text-center py-24">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-serif font-bold text-foreground">Document not found</h2>
        <p className="text-muted-foreground mt-2">The document may have been deleted or there was an error.</p>
      </div>
    );
  }

  const invalidateDoc = () => queryClient.invalidateQueries({ queryKey: getGetDocumentQueryKey(id) });

  const handleSimplify = (level: any) => {
    setReadingLevel(level);
    if (level === "original") return;
    
    simplifyMutation.mutate(
      { id, data: { readingLevel: level } },
      {
        onSuccess: () => {
          toast.success(`Text simplified to ${level} school level`);
          invalidateDoc();
        },
        onError: () => toast.error("Failed to simplify text")
      }
    );
  };

  const handleGenerateAudio = () => {
    generateAudioMutation.mutate(
      { id, data: { voice: voice as any, useSimplified: useSimplifiedForAudio } },
      {
        onSuccess: () => {
          toast.success("Audio generated successfully");
          invalidateDoc();
        },
        onError: () => toast.error("Failed to generate audio")
      }
    );
  };

  const handleGenerateCaptions = () => {
    generateCaptionsMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Captions generated successfully");
          invalidateDoc();
        },
        onError: () => toast.error("Failed to generate captions")
      }
    );
  };

  const handleAnalyze = () => {
    analyzeMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Analysis complete");
          invalidateDoc();
        },
        onError: () => toast.error("Failed to analyze document")
      }
    );
  };

  const handleAutoFix = () => {
    autoFixMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Auto-fixes applied successfully");
          invalidateDoc();
        },
        onError: () => toast.error("Failed to apply fixes")
      }
    );
  };

  const handleTranscribe = () => {
    if (!document.audioDataUrl) return;
    transcribeMutation.mutate(
      { id, data: { audioDataUrl: document.audioDataUrl } },
      {
        onSuccess: () => {
          toast.success("Transcription complete");
          invalidateDoc();
        },
        onError: () => toast.error("Failed to transcribe audio")
      }
    );
  };

  const copyCaptionsJson = () => {
    if (!document.captions) return;
    navigator.clipboard.writeText(JSON.stringify(document.captions, null, 2));
    toast.success("Copied to clipboard");
  };

  const hasText = !!(document.extractedText || document.originalText);
  const textToRead = readingLevel !== "original" && document.simplifiedText 
    ? document.simplifiedText 
    : (document.extractedText || document.originalText);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className="capitalize bg-card">{document.sourceType}</Badge>
            {document.status === 'processing' && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30">Processing</Badge>
            )}
            {document.status === 'failed' && (
              <Badge variant="destructive">Failed</Badge>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-primary tracking-tight leading-tight">
            {document.title}
          </h1>
        </div>
        <ShareDialog token={document.shareToken} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 p-1 w-full justify-start overflow-x-auto">
          <TabsTrigger value="read" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <BookOpen className="w-4 h-4 mr-2" /> Read
          </TabsTrigger>
          <TabsTrigger value="listen" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Headphones className="w-4 h-4 mr-2" /> Listen
          </TabsTrigger>
          <TabsTrigger value="captions" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Captions className="w-4 h-4 mr-2" /> Captions
          </TabsTrigger>
          <TabsTrigger value="accessibility" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <ShieldAlert className="w-4 h-4 mr-2" /> Accessibility <Badge className="ml-2 bg-primary text-primary-foreground">{document.accessibilityScore}%</Badge>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {/* READ TAB */}
          <TabsContent value="read" className="mt-0 focus-visible:outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <Card className="border-border/50 shadow-sm">
                  <CardHeader className="bg-muted/20 border-b flex flex-row items-center justify-between py-3">
                    <div className="flex items-center gap-4">
                      <Select value={readingLevel} onValueChange={handleSimplify}>
                        <SelectTrigger className="w-[180px] h-8 text-xs bg-background">
                          <SelectValue placeholder="Reading Level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="original">Original Text</SelectItem>
                          <SelectItem value="high">High School Level</SelectItem>
                          <SelectItem value="middle">Middle School Level</SelectItem>
                          <SelectItem value="elementary">Elementary Level</SelectItem>
                        </SelectContent>
                      </Select>
                      {simplifyMutation.isPending && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 hidden md:flex">
                        <span className="text-xs text-muted-foreground">A</span>
                        <Slider 
                          value={localFontSize} 
                          onValueChange={setLocalFontSize} 
                          max={150} min={80} step={5} 
                          className="w-24"
                        />
                        <span className="text-xs font-bold text-muted-foreground">A</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="dyslexia" checked={dyslexiaMode} onCheckedChange={setDyslexiaMode} />
                        <Label htmlFor="dyslexia" className="text-xs">Dyslexia Font</Label>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 md:p-12 min-h-[500px]">
                    {!hasText ? (
                      document.sourceType === 'audio' ? (
                        <div className="text-center py-20">
                          <FileAudio className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                          <h3 className="text-lg font-medium mb-2">Audio needs transcription</h3>
                          <p className="text-muted-foreground mb-4">Generate a transcript to read the content.</p>
                          <Button onClick={handleTranscribe} disabled={transcribeMutation.isPending}>
                            {transcribeMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                            Transcribe Audio
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-20 flex flex-col items-center">
                          <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                          <p className="text-muted-foreground">Extracting text...</p>
                        </div>
                      )
                    ) : (
                      <div 
                        className={`prose dark:prose-invert max-w-none transition-all ${dyslexiaMode ? 'dyslexia-friendly' : ''}`}
                        style={{ fontSize: `${localFontSize[0]}%` }}
                      >
                        {textToRead.split('\n').map((paragraph, idx) => (
                          paragraph.trim() ? <p key={idx}>{paragraph}</p> : <br key={idx} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-6">
                <Card className="bg-primary/5 border-primary/10 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" /> AI Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    {document.summary ? (
                      <p className="leading-relaxed">{document.summary}</p>
                    ) : (
                      <span className="text-muted-foreground italic">Summary will appear once processing is complete.</span>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="shadow-none border-border/50">
                  <CardHeader className="pb-3 bg-muted/20 border-b">
                    <CardTitle className="text-sm font-bold">Key Terms</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {document.keyTerms && document.keyTerms.length > 0 ? (
                      <div className="divide-y">
                        {document.keyTerms.map((term, i) => (
                          <div key={i} className="p-4 hover:bg-muted/10 transition-colors">
                            <dt className="font-semibold text-sm text-primary mb-1">{term.term}</dt>
                            <dd className="text-sm text-muted-foreground">{term.definition}</dd>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground italic">No key terms extracted yet.</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* LISTEN TAB */}
          <TabsContent value="listen" className="mt-0 focus-visible:outline-none">
            <Card className="max-w-2xl mx-auto border-border/50 shadow-sm overflow-hidden">
              <div className="bg-primary/5 p-8 flex flex-col items-center justify-center border-b border-primary/10">
                <div className="w-24 h-24 bg-background rounded-full shadow-sm flex items-center justify-center mb-6">
                  <Headphones className="w-10 h-10 text-primary" />
                </div>
                
                {document.audioDataUrl ? (
                  <audio controls src={document.audioDataUrl} className="w-full max-w-md" />
                ) : (
                  <div className="text-center">
                    <h3 className="font-medium mb-1">No audio generated yet</h3>
                    <p className="text-sm text-muted-foreground mb-6">Generate an AI voice narration of this document.</p>
                    
                    <div className="flex flex-col items-center gap-4 bg-background p-6 rounded-xl border shadow-sm">
                      <div className="flex items-center gap-4 w-full">
                        <Label className="w-24 text-right text-xs">Voice Actor</Label>
                        <Select value={voice} onValueChange={setVoice}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="alloy">Alloy (Neutral)</SelectItem>
                            <SelectItem value="echo">Echo (Warm)</SelectItem>
                            <SelectItem value="fable">Fable (Expressive)</SelectItem>
                            <SelectItem value="onyx">Onyx (Deep)</SelectItem>
                            <SelectItem value="nova">Nova (Energetic)</SelectItem>
                            <SelectItem value="shimmer">Shimmer (Clear)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center gap-4 w-full">
                        <Label className="w-24 text-right text-xs">Source Text</Label>
                        <div className="flex items-center space-x-2">
                          <Switch 
                            id="use-simp" 
                            checked={useSimplifiedForAudio} 
                            onCheckedChange={setUseSimplifiedForAudio}
                            disabled={!document.simplifiedText}
                          />
                          <Label htmlFor="use-simp" className="text-xs font-normal">Use simplified version (if available)</Label>
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full mt-2 rounded-full" 
                        onClick={handleGenerateAudio}
                        disabled={generateAudioMutation.isPending || !hasText}
                      >
                        {generateAudioMutation.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                        ) : (
                          <><Sparkles className="w-4 h-4 mr-2" /> Generate Narration</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              {document.audioDataUrl && (
                <div className="p-4 bg-muted/20 flex justify-between items-center text-xs text-muted-foreground">
                  <span>Voice: <span className="font-medium capitalize text-foreground">{document.audioVoice || 'AI'}</span></span>
                  <Button variant="ghost" size="sm" onClick={() => {
                    toast.success("Generating new audio...");
                    handleGenerateAudio();
                  }}>
                    Regenerate
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* CAPTIONS TAB */}
          <TabsContent value="captions" className="mt-0 focus-visible:outline-none">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 pb-4">
                <div>
                  <CardTitle className="text-lg">Structured Captions</CardTitle>
                  <CardDescription>Timed text chunks optimized for sign-language interpretation pipelines.</CardDescription>
                </div>
                <div className="flex gap-2">
                  {document.captions?.length > 0 && (
                    <Button variant="outline" size="sm" onClick={copyCaptionsJson}>
                      <Copy className="w-4 h-4 mr-2" /> Copy JSON
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    onClick={handleGenerateCaptions}
                    disabled={generateCaptionsMutation.isPending || !hasText}
                  >
                    {generateCaptionsMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Generate Captions"
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {document.captions && document.captions.length > 0 ? (
                  <div className="divide-y max-h-[600px] overflow-y-auto">
                    {document.captions.map((chunk) => (
                      <div key={chunk.index} className="p-4 hover:bg-muted/10 transition-colors flex gap-4">
                        <div className="text-xs font-mono text-muted-foreground w-16 pt-1">
                          {Math.floor(chunk.startMs / 1000)}s - {Math.floor(chunk.endMs / 1000)}s
                        </div>
                        <div className="flex-1 space-y-1">
                          {chunk.heading && <h4 className="font-semibold text-sm">{chunk.heading}</h4>}
                          <p className="text-sm">{chunk.text}</p>
                          {chunk.signLanguageGloss && (
                            <div className="mt-2 text-xs font-mono bg-primary/5 p-2 rounded text-primary">
                              <span className="font-semibold mr-2">GLOSS:</span>
                              {chunk.signLanguageGloss}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-muted-foreground">
                    <Captions className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No captions generated yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ACCESSIBILITY TAB */}
          <TabsContent value="accessibility" className="mt-0 focus-visible:outline-none">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-1 border-border/50 shadow-sm bg-card h-fit sticky top-24">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Accessibility Score</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <div className="w-32 h-32 rounded-full border-8 border-primary/20 flex items-center justify-center relative mb-4">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle 
                        cx="50%" cy="50%" r="46%" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="8%" 
                        className="text-primary"
                        strokeDasharray={`${document.accessibilityScore * 2.89} 300`} 
                      />
                    </svg>
                    <span className="text-4xl font-bold text-primary">{document.accessibilityScore}</span>
                  </div>
                  
                  <div className="space-y-3 w-full mt-4">
                    <Button 
                      className="w-full" 
                      variant="outline" 
                      onClick={handleAnalyze}
                      disabled={analyzeMutation.isPending}
                    >
                      {analyzeMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Re-analyze"}
                    </Button>
                    <Button 
                      className="w-full" 
                      onClick={handleAutoFix}
                      disabled={autoFixMutation.isPending || document.issues?.every(i => i.fixed)}
                    >
                      {autoFixMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-2" /> Apply Auto-fixes</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="md:col-span-2 space-y-4">
                <h3 className="font-serif text-xl font-bold flex items-center gap-2">
                  Identified Issues 
                  <Badge variant="secondary" className="rounded-full">{document.issues?.length || 0}</Badge>
                </h3>
                
                {document.issues && document.issues.length > 0 ? (
                  <div className="space-y-4">
                    {document.issues.map((issue) => (
                      <Card key={issue.id} className={`border-l-4 overflow-hidden shadow-sm ${
                        issue.fixed ? 'border-l-green-500 opacity-70' : 
                        issue.severity === 'critical' ? 'border-l-red-500' : 
                        issue.severity === 'warning' ? 'border-l-amber-500' : 'border-l-blue-500'
                      }`}>
                        <div className="p-4 bg-card">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              {issue.fixed ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : issue.severity === 'critical' ? (
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                              ) : (
                                <Info className="w-4 h-4 text-amber-500" />
                              )}
                              <span className="font-semibold text-sm">{issue.category}</span>
                            </div>
                            {issue.fixed && <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0 dark:bg-green-900/30 dark:text-green-400">Fixed</Badge>}
                          </div>
                          <p className="text-sm text-foreground mb-3">{issue.message}</p>
                          <div className="bg-muted/50 p-3 rounded-md border text-sm">
                            <span className="font-semibold mr-2">Suggestion:</span>
                            <span className="text-muted-foreground">{issue.suggestion}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                    
                    {document.altText && (
                      <Card className="mt-8 border-primary/20 bg-primary/5 shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" /> Generated Alt Text
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm italic text-muted-foreground">"{document.altText}"</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <Card className="border-dashed bg-muted/20">
                    <CardContent className="p-12 text-center text-muted-foreground">
                      <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-50" />
                      <p>No accessibility issues found. Excellent!</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// Just importing ImageIcon here
import { Image as ImageIcon } from "lucide-react";

function ShareDialog({ token }: { token: string }) {
  const shareUrl = `${window.location.origin}${import.meta.env.BASE_URL}shared/${token}`;
  const copy = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied to clipboard");
  };
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Share2 className="w-4 h-4" /> Share with student
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this material</DialogTitle>
          <DialogDescription>
            Anyone with this link can read the accessible version — no sign-in required. The faculty controls and accessibility audit stay private.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 mt-2">
          <Input value={shareUrl} readOnly className="font-mono text-xs" />
          <Button onClick={copy} className="gap-2 shrink-0">
            <Copy className="w-4 h-4" /> Copy
          </Button>
        </div>
        <a
          href={shareUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-primary inline-flex items-center gap-1 hover:underline"
        >
          Open public view <ExternalLink className="w-3 h-3" />
        </a>
      </DialogContent>
    </Dialog>
  );
}
