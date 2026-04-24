import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useListDocuments, useDeleteDocument, getListDocumentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MoreVertical, Trash2, FileText, AudioLines, FileImage, Type, BookOpen, Volume2, Captions, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

function getScoreColor(score: number) {
  if (score >= 90) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  if (score >= 70) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
}

function getSourceIcon(type: string) {
  switch (type) {
    case 'pdf': return FileText;
    case 'image': return FileImage;
    case 'audio': return AudioLines;
    case 'text': return Type;
    default: return FileText;
  }
}

export default function Library() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  
  const queryClient = useQueryClient();
  const { data: documents, isLoading } = useListDocuments();
  const deleteDoc = useDeleteDocument();

  const filteredDocs = documents?.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || doc.sourceType === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleDelete = (id: number) => {
    deleteDoc.mutate({ id }, {
      onSuccess: () => {
        toast.success("Document deleted");
        queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
      },
      onError: () => {
        toast.error("Failed to delete document");
      }
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Library</h1>
          <p className="text-muted-foreground mt-1">All your accessible learning materials.</p>
        </div>
        <Button asChild size="lg" className="rounded-full shadow-sm hover-elevate">
          <Link href="/upload" className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Upload Material
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search documents..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-full bg-card"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px] rounded-full bg-card">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="text">Text</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="flex flex-col">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/4" />
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredDocs?.length === 0 ? (
        <div className="text-center py-24 bg-card rounded-2xl border border-dashed border-border/60">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-serif font-medium mb-2">Your library is quiet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {search ? "No documents match your search criteria." : "Upload your first lecture, PDF, or notes to make them accessible."}
          </p>
          {!search && (
            <Button asChild className="rounded-full">
              <Link href="/upload">Upload Material</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocs?.map((doc) => {
            const Icon = getSourceIcon(doc.sourceType);
            const scoreColor = getScoreColor(doc.accessibilityScore);
            
            return (
              <Card key={doc.id} className="flex flex-col group hover:shadow-md transition-shadow duration-300">
                <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1 truncate pr-4">
                    <CardTitle className="text-lg font-serif leading-tight">
                      <Link href={`/document/${doc.id}`} className="hover:text-primary hover:underline underline-offset-4 truncate block">
                        {doc.title}
                      </Link>
                    </CardTitle>
                    <div className="flex items-center text-xs text-muted-foreground gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      <span className="capitalize">{doc.sourceType}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                        onClick={() => handleDelete(doc.id)}
                        disabled={deleteDoc.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                
                <CardContent className="flex-1 pb-4">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary" className={`${scoreColor} hover:${scoreColor} border-0`}>
                      Score: {doc.accessibilityScore}%
                    </Badge>
                    {doc.status === 'processing' && (
                      <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950/30">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Processing
                      </Badge>
                    )}
                    {doc.status === 'failed' && (
                      <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50 dark:border-red-800 dark:text-red-300 dark:bg-red-950/30">
                        Failed
                      </Badge>
                    )}
                  </div>
                  
                  {doc.issueCount > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2 bg-muted/50 p-2 rounded-md">
                      <ShieldAlert className="h-4 w-4 text-amber-500" />
                      <span>{doc.issueCount} accessibility issues</span>
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="pt-4 border-t bg-muted/20 flex gap-4 text-sm text-muted-foreground justify-between items-center">
                  <div className="flex gap-3">
                    <div className={`flex items-center gap-1.5 ${doc.hasSimplified ? 'text-primary' : 'opacity-50'}`} title="Simplified Text">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className={`flex items-center gap-1.5 ${doc.hasAudio ? 'text-primary' : 'opacity-50'}`} title="Audio version">
                      <Volume2 className="h-4 w-4" />
                    </div>
                    <div className={`flex items-center gap-1.5 ${doc.hasCaptions ? 'text-primary' : 'opacity-50'}`} title="Captions">
                      <Captions className="h-4 w-4" />
                    </div>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="h-8">
                    <Link href={`/document/${doc.id}`}>Open</Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// Just importing Plus here so it's defined
import { Plus } from "lucide-react";
