import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateDocument } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Image as ImageIcon, AudioLines, Type, UploadCloud, Loader2 } from "lucide-react";
import { toast } from "sonner";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  sourceType: z.enum(["pdf", "image", "audio", "text"]),
  text: z.string().optional(),
  imageDataUrl: z.string().optional(),
  audioDataUrl: z.string().optional(),
});

export default function Upload() {
  const [, setLocation] = useLocation();
  const createDocument = useCreateDocument();
  const [dragActive, setDragActive] = useState(false);
  const [filePreview, setFilePreview] = useState<{name: string, url: string, type: string} | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      sourceType: "text",
      text: "",
    },
  });

  const watchSourceType = form.watch("sourceType");

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Validation
    if (values.sourceType === "text" && !values.text) {
      form.setError("text", { message: "Text content is required" });
      return;
    }
    if ((values.sourceType === "image" || values.sourceType === "pdf") && !values.imageDataUrl) {
      toast.error("Please select a file to upload");
      return;
    }
    if (values.sourceType === "audio" && !values.audioDataUrl) {
      toast.error("Please select an audio file to upload");
      return;
    }

    createDocument.mutate({ data: values as any }, {
      onSuccess: (doc) => {
        toast.success("Material uploaded successfully");
        setLocation(`/document/${doc.id}`);
      },
      onError: (err) => {
        toast.error("Failed to upload material");
        console.error(err);
      }
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = useCallback((file: File) => {
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    const isAudio = file.type.startsWith("audio/");

    if (!isImage && !isPdf && !isAudio) {
      toast.error("Unsupported file type. Please upload an image, PDF, or audio file.");
      return;
    }

    // Auto-set title if empty
    if (!form.getValues("title")) {
      form.setValue("title", file.name.replace(/\.[^/.]+$/, ""));
    }

    if (isImage || isPdf) {
      form.setValue("sourceType", isPdf ? "pdf" : "image");
    } else if (isAudio) {
      form.setValue("sourceType", "audio");
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (isImage || isPdf) {
        form.setValue("imageDataUrl", dataUrl);
      } else {
        form.setValue("audioDataUrl", dataUrl);
      }
      setFilePreview({ name: file.name, url: dataUrl, type: file.type });
    };
    reader.readAsDataURL(file);
  }, [form]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const clearFile = () => {
    setFilePreview(null);
    form.setValue("imageDataUrl", "");
    form.setValue("audioDataUrl", "");
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-8"
    >
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Upload Material</h1>
        <p className="text-muted-foreground">Add new content to make it accessible for all students.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Material Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Intro to Cognitive Psychology - Chapter 1" className="bg-background text-lg py-6" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardHeader>
            <CardContent className="p-6">
              <Tabs 
                value={watchSourceType === 'pdf' ? 'image' : watchSourceType} 
                onValueChange={(val) => {
                  form.setValue("sourceType", val as any);
                  clearFile();
                }} 
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/50 p-1">
                  <TabsTrigger value="text" className="py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Type className="w-4 h-4 mr-2" /> Paste Text
                  </TabsTrigger>
                  <TabsTrigger value="image" className="py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <FileText className="w-4 h-4 mr-2" /> PDF / Image
                  </TabsTrigger>
                  <TabsTrigger value="audio" className="py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <AudioLines className="w-4 h-4 mr-2" /> Audio Lecture
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                  <FormField
                    control={form.control}
                    name="text"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea 
                            placeholder="Paste your syllabus, notes, or chapter text here..." 
                            className="min-h-[300px] resize-y bg-background font-mono text-sm p-4 leading-relaxed" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-sm text-muted-foreground mt-4 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Text will be analyzed for reading level and key terms automatically.
                  </p>
                </TabsContent>

                <TabsContent value="image" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                  {filePreview && watchSourceType !== "audio" ? (
                    <div className="border rounded-xl p-4 bg-muted/20 relative group">
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="sm" 
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={clearFile}
                      >
                        Remove
                      </Button>
                      <div className="flex items-center gap-4">
                        <div className="bg-background border p-4 rounded-lg flex items-center justify-center">
                          {filePreview.type.startsWith('image/') ? (
                            <ImageIcon className="w-8 h-8 text-primary" />
                          ) : (
                            <FileText className="w-8 h-8 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium truncate max-w-[400px]">{filePreview.name}</p>
                          <p className="text-sm text-muted-foreground">{filePreview.type}</p>
                        </div>
                      </div>
                      {filePreview.type.startsWith('image/') && (
                        <div className="mt-4 aspect-video relative rounded-lg overflow-hidden border bg-black/5">
                          <img src={filePreview.url} alt="Preview" className="object-contain w-full h-full" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div 
                      className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'}`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <input
                        type="file"
                        id="file-upload-image"
                        className="hidden"
                        accept="image/*,application/pdf"
                        onChange={handleChange}
                      />
                      <label htmlFor="file-upload-image" className="cursor-pointer flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                          <UploadCloud className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold mb-1">Drag & drop your file here</h3>
                        <p className="text-sm text-muted-foreground mb-4">Supports PDF, PNG, JPG, JPEG</p>
                        <Button type="button" variant="outline">Browse Files</Button>
                      </label>
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground mt-6 space-y-2">
                    <p className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Optical Character Recognition (OCR) will extract text automatically.</p>
                    <p className="flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Document will be analyzed for accessibility gaps.</p>
                  </div>
                </TabsContent>

                <TabsContent value="audio" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                  {filePreview && watchSourceType === "audio" ? (
                    <div className="border rounded-xl p-4 bg-muted/20 relative group">
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="sm" 
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={clearFile}
                      >
                        Remove
                      </Button>
                      <div className="flex items-center gap-4">
                        <div className="bg-background border p-4 rounded-lg flex items-center justify-center">
                          <AudioLines className="w-8 h-8 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium truncate pr-16">{filePreview.name}</p>
                          <audio src={filePreview.url} controls className="w-full mt-2 h-8" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'}`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <input
                        type="file"
                        id="file-upload-audio"
                        className="hidden"
                        accept="audio/*"
                        onChange={handleChange}
                      />
                      <label htmlFor="file-upload-audio" className="cursor-pointer flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                          <AudioLines className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold mb-1">Upload Audio Recording</h3>
                        <p className="text-sm text-muted-foreground mb-4">Supports MP3, WAV, M4A, OGG</p>
                        <Button type="button" variant="outline">Browse Files</Button>
                      </label>
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground mt-6 space-y-2">
                    <p className="flex items-center gap-2"><Type className="w-4 h-4" /> Audio will be transcribed automatically.</p>
                    <p className="flex items-center gap-2"><Captions className="w-4 h-4" /> Timed captions can be generated from transcription.</p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t p-6 flex justify-between items-center">
              <Button type="button" variant="ghost" asChild>
                <Link href="/">Cancel</Link>
              </Button>
              <Button type="submit" size="lg" className="rounded-full px-8" disabled={createDocument.isPending}>
                {createDocument.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Upload & Process"
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </motion.div>
  );
}

// Just importing icons here so they are defined
import { ShieldAlert, BookOpen } from "lucide-react";
