import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagBadge } from "./tag-badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Trash2, FileText } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Tag } from "./tag-selector-dialog";

interface TagPromptSectionProps {
  tags: Tag[];
  onUpdatePrompt: (tagId: string, prompt: string) => void;
  onDeleteTag: (tagId: string) => void;
}

export function TagPromptSection({ tags, onUpdatePrompt, onDeleteTag }: TagPromptSectionProps) {
  const [editingPrompts, setEditingPrompts] = useState<Record<string, string>>({});
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);

  const sortedTags = [...tags].sort((a, b) => a.name.localeCompare(b.name));

  const handlePromptChange = (tagId: string, value: string) => {
    setEditingPrompts((prev) => ({ ...prev, [tagId]: value }));
  };

  const handleSavePrompt = (tagId: string) => {
    const prompt = editingPrompts[tagId];
    if (prompt !== undefined) {
      onUpdatePrompt(tagId, prompt);
      setEditingPrompts((prev) => {
        const { [tagId]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const getPromptValue = (tag: Tag) => {
    return editingPrompts[tag.id] !== undefined ? editingPrompts[tag.id] : tag.systemPrompt;
  };

  const hasChanges = (tag: Tag) => {
    return editingPrompts[tag.id] !== undefined && editingPrompts[tag.id] !== tag.systemPrompt;
  };

  if (tags.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tag-Specific System Prompts</CardTitle>
          <CardDescription>
            Create tags to define specific AI behaviors for different types of knowledge
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mb-3 opacity-50" />
            <p>No tags created yet</p>
            <p className="text-sm mt-1">Upload documents with tags to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tag-Specific System Prompts</CardTitle>
          <CardDescription>
            Define custom AI behavior for each tag category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {sortedTags.map((tag) => (
              <AccordionItem key={tag.id} value={tag.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 flex-1">
                    <TagBadge name={tag.name} color={tag.color} />
                    <span className="text-sm text-muted-foreground">
                      {tag.documentCount} {tag.documentCount === 1 ? "document" : "documents"}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor={`prompt-${tag.id}`}>System Prompt</Label>
                      <Textarea
                        id={`prompt-${tag.id}`}
                        value={getPromptValue(tag)}
                        onChange={(e) => handlePromptChange(tag.id, e.target.value)}
                        rows={5}
                        placeholder={`Define how the AI should respond when using ${tag.name} knowledge...`}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSavePrompt(tag.id)}
                        disabled={!hasChanges(tag)}
                        size="sm"
                      >
                        Save Prompt
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setTagToDelete(tag)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Tag
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <AlertDialog open={!!tagToDelete} onOpenChange={() => setTagToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tag?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the tag "{tagToDelete?.name}"? This will remove the tag from all documents, but the documents themselves will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (tagToDelete) {
                  onDeleteTag(tagToDelete.id);
                  setTagToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Tag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
