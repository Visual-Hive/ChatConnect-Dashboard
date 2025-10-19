import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/file-upload";
import { DocumentList } from "@/components/document-list";
import { Input } from "@/components/ui/input";
import { Search, TestTube2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TagSelectorDialog, type Tag } from "@/components/tag-selector-dialog";
import { TagPromptSection } from "@/components/tag-prompt-section";

interface Document {
  id: string;
  name: string;
  size: string;
  status: "processing" | "ready" | "failed";
  uploadedAt: Date;
  tags: string[];
}

export default function KnowledgeBase() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: "1",
      name: "conference-schedule.pdf",
      size: "2.4 MB",
      status: "ready" as const,
      uploadedAt: new Date(),
      tags: ["1", "3"],
    },
    {
      id: "2",
      name: "speaker-bios.pdf",
      size: "1.8 MB",
      status: "processing" as const,
      uploadedAt: new Date(),
      tags: ["2"],
    },
    {
      id: "3",
      name: "venue-info.csv",
      size: "0.5 MB",
      status: "ready" as const,
      uploadedAt: new Date(),
      tags: ["3"],
    },
  ]);

  const [tags, setTags] = useState<Tag[]>([
    {
      id: "1",
      name: "Schedule",
      color: "#3b82f6",
      systemPrompt: "Focus on time-sensitive information about the conference schedule. Provide precise times, dates, and locations for all events. Be concise and structured in your responses.",
      documentCount: 1,
      createdAt: new Date("2024-01-01"),
    },
    {
      id: "2",
      name: "Speakers",
      color: "#10b981",
      systemPrompt: "Provide detailed information about speakers, their backgrounds, expertise, and presentations. Be engaging and highlight their achievements and areas of expertise.",
      documentCount: 1,
      createdAt: new Date("2024-01-02"),
    },
    {
      id: "3",
      name: "Venue",
      color: "#8b5cf6",
      systemPrompt: "Answer questions about the venue location, facilities, accessibility, and amenities. Include practical information about navigation, parking, and nearby services.",
      documentCount: 2,
      createdAt: new Date("2024-01-03"),
    },
  ]);

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showTagDialog, setShowTagDialog] = useState(false);

  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful conference assistant. Answer questions about the conference schedule, speakers, venue, and general information. Be friendly and concise."
  );

  const [testQuestion, setTestQuestion] = useState("");

  const handleFilesReadyForTagging = (files: File[]) => {
    setPendingFiles(files);
    setShowTagDialog(true);
  };

  const handleCreateTag = (name: string, color: string) => {
    const newTag: Tag = {
      id: `tag-${Date.now()}`,
      name,
      color,
      systemPrompt: `Define how the AI should respond when using ${name} knowledge...`,
      documentCount: 0,
      createdAt: new Date(),
    };
    setTags([...tags, newTag]);
    toast({
      title: "Tag created",
      description: `Tag "${name}" has been created.`,
    });
  };

  const handleTagsSelected = (tagIds: string[]) => {
    if (pendingFiles.length === 0) return;

    const newDocs: Document[] = pendingFiles.map((file, index) => ({
      id: `new-${Date.now()}-${index}`,
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      status: "processing" as const,
      uploadedAt: new Date(),
      tags: tagIds,
    }));

    setDocuments([...documents, ...newDocs]);

    // Update tag document counts
    setTags((prevTags) =>
      prevTags.map((tag) =>
        tagIds.includes(tag.id)
          ? { ...tag, documentCount: tag.documentCount + pendingFiles.length }
          : tag
      )
    );

    toast({
      title: "Files uploaded",
      description: `${pendingFiles.length} file(s) are being processed.`,
    });

    // Simulate processing
    setTimeout(() => {
      setDocuments((prev) =>
        prev.map((doc) =>
          newDocs.find((d) => d.id === doc.id)
            ? { ...doc, status: "ready" as const }
            : doc
        )
      );
    }, 3000);

    setPendingFiles([]);
  };

  const handleDelete = (id: string) => {
    const doc = documents.find((d) => d.id === id);
    if (doc) {
      // Update tag document counts
      setTags((prevTags) =>
        prevTags.map((tag) =>
          doc.tags.includes(tag.id)
            ? { ...tag, documentCount: Math.max(0, tag.documentCount - 1) }
            : tag
        )
      );
    }
    setDocuments(documents.filter((doc) => doc.id !== id));
    toast({
      title: "Document deleted",
      description: "The document has been removed from your knowledge base.",
    });
  };

  const handleUpdateTagPrompt = (tagId: string, prompt: string) => {
    setTags((prevTags) =>
      prevTags.map((tag) => (tag.id === tagId ? { ...tag, systemPrompt: prompt } : tag))
    );
    toast({
      title: "Prompt updated",
      description: "Tag-specific system prompt has been saved.",
    });
  };

  const handleDeleteTag = (tagId: string) => {
    const tag = tags.find((t) => t.id === tagId);
    
    // Remove tag from all documents
    setDocuments((prevDocs) =>
      prevDocs.map((doc) => ({
        ...doc,
        tags: doc.tags.filter((id) => id !== tagId),
      }))
    );

    // Remove the tag
    setTags((prevTags) => prevTags.filter((t) => t.id !== tagId));

    toast({
      title: "Tag deleted",
      description: `Tag "${tag?.name}" has been removed from all documents.`,
    });
  };

  const handleTestKnowledge = () => {
    if (!testQuestion.trim()) return;

    toast({
      title: "Testing knowledge base",
      description: "AI is processing your question...",
    });

    setTimeout(() => {
      toast({
        title: "Test result",
        description: "The keynote starts at 9:00 AM in the Main Hall.",
      });
      setTestQuestion("");
    }, 1500);
  };

  const handleSavePrompt = () => {
    toast({
      title: "System prompt saved",
      description: "Your AI personality has been updated.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Knowledge Base</h1>
        <p className="text-muted-foreground mt-1">
          Upload documents and customize your AI assistant's behavior
        </p>
      </div>

      <FileUpload 
        onFilesSelected={(files, tagIds) => {
          // This path is for when we implement backend
          console.log("Files selected with tags:", files, tagIds);
        }}
        onFilesReadyForTagging={handleFilesReadyForTagging}
      />

      <DocumentList
        documents={documents}
        tags={tags}
        onDelete={handleDelete}
        onView={(id) => console.log("View document:", id)}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Main System Prompt</CardTitle>
          <CardDescription>
            Default system prompt for general queries and untagged documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={6}
            data-testid="input-system-prompt"
          />
          <Button onClick={handleSavePrompt} data-testid="button-save-prompt">
            Save System Prompt
          </Button>
        </CardContent>
      </Card>

      <TagPromptSection
        tags={tags}
        onUpdatePrompt={handleUpdateTagPrompt}
        onDeleteTag={handleDeleteTag}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Test Knowledge</CardTitle>
          <CardDescription>
            Ask a sample question to test your knowledge base
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g., When does the keynote start?"
              value={testQuestion}
              onChange={(e) => setTestQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTestKnowledge()}
              data-testid="input-test-question"
            />
            <Button onClick={handleTestKnowledge} data-testid="button-test-knowledge">
              <TestTube2 className="h-4 w-4 mr-2" />
              Test
            </Button>
          </div>
        </CardContent>
      </Card>

      <TagSelectorDialog
        open={showTagDialog}
        onOpenChange={setShowTagDialog}
        existingTags={tags}
        selectedTagIds={[]}
        onTagsSelected={handleTagsSelected}
        onCreateTag={handleCreateTag}
      />
    </div>
  );
}
