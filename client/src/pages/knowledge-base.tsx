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

export default function KnowledgeBase() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState([
    {
      id: "1",
      name: "conference-schedule.pdf",
      size: "2.4 MB",
      status: "ready" as const,
      uploadedAt: new Date(),
    },
    {
      id: "2",
      name: "speaker-bios.pdf",
      size: "1.8 MB",
      status: "processing" as const,
      uploadedAt: new Date(),
    },
    {
      id: "3",
      name: "venue-info.csv",
      size: "0.5 MB",
      status: "ready" as const,
      uploadedAt: new Date(),
    },
  ]);

  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful conference assistant. Answer questions about the conference schedule, speakers, venue, and general information. Be friendly and concise."
  );

  const [testQuestion, setTestQuestion] = useState("");

  const handleFilesSelected = (files: File[]) => {
    const newDocs = files.map((file, index) => ({
      id: `new-${Date.now()}-${index}`,
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      status: "processing" as const,
      uploadedAt: new Date(),
    }));

    setDocuments([...documents, ...newDocs]);

    toast({
      title: "Files uploaded",
      description: `${files.length} file(s) are being processed.`,
    });

    setTimeout(() => {
      setDocuments((prev) =>
        prev.map((doc) =>
          newDocs.find((d) => d.id === doc.id)
            ? { ...doc, status: "ready" as const }
            : doc
        )
      );
    }, 3000);
  };

  const handleDelete = (id: string) => {
    setDocuments(documents.filter((doc) => doc.id !== id));
    toast({
      title: "Document deleted",
      description: "The document has been removed from your knowledge base.",
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

      <FileUpload onFilesSelected={handleFilesSelected} />

      <DocumentList
        documents={documents}
        onDelete={handleDelete}
        onView={(id) => console.log("View document:", id)}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Prompt</CardTitle>
          <CardDescription>
            Customize how the AI assistant responds to questions
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
    </div>
  );
}
