import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagBadge } from "./tag-badge";
import { Plus, Tag as TagIcon } from "lucide-react";

export interface Tag {
  id: string;
  name: string;
  color: string;
  systemPrompt: string;
  documentCount: number;
  createdAt: Date;
}

interface TagSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingTags: Tag[];
  selectedTagIds: string[];
  onTagsSelected: (tagIds: string[]) => void;
  onCreateTag: (name: string, color: string) => void;
}

const TAG_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#8b5cf6", // purple
  "#f59e0b", // orange
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // deep orange
  "#6366f1", // indigo
];

function getRandomColor() {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
}

export function TagSelectorDialog({
  open,
  onOpenChange,
  existingTags,
  selectedTagIds,
  onTagsSelected,
  onCreateTag,
}: TagSelectorDialogProps) {
  const [newTagName, setNewTagName] = useState("");
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedTagIds);

  const handleToggleTag = (tagId: string) => {
    setLocalSelectedIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleCreateTag = () => {
    if (newTagName.trim()) {
      onCreateTag(newTagName.trim(), getRandomColor());
      setNewTagName("");
    }
  };

  const handleConfirm = () => {
    onTagsSelected(localSelectedIds);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select or Create Tags</DialogTitle>
          <DialogDescription>
            Choose tags for your uploaded documents or create new ones
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Existing Tags */}
          {existingTags.length > 0 && (
            <div className="space-y-2">
              <Label>Select Existing Tags</Label>
              <div className="flex flex-wrap gap-2">
                {existingTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleToggleTag(tag.id)}
                    className={`transition-opacity ${
                      localSelectedIds.includes(tag.id) ? "opacity-100" : "opacity-50 hover:opacity-75"
                    }`}
                  >
                    <TagBadge name={tag.name} color={tag.color} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Create New Tag */}
          <div className="space-y-2">
            <Label htmlFor="new-tag">Create New Tag</Label>
            <div className="flex gap-2">
              <Input
                id="new-tag"
                placeholder="Enter tag name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCreateTag}
                disabled={!newTagName.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Selected Tags Preview */}
          {localSelectedIds.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-sm">Selected Tags ({localSelectedIds.length})</Label>
              <div className="flex flex-wrap gap-2">
                {localSelectedIds.map((tagId) => {
                  const tag = existingTags.find((t) => t.id === tagId);
                  return tag ? (
                    <TagBadge
                      key={tag.id}
                      name={tag.name}
                      color={tag.color}
                      onRemove={() => handleToggleTag(tag.id)}
                    />
                  ) : null;
                })}
              </div>
            </div>
          )}

          {localSelectedIds.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              <TagIcon className="h-4 w-4" />
              <span>Please select at least one tag for your documents</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={localSelectedIds.length === 0}>
            Confirm Tags
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
