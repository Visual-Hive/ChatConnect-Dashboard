import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, MoreVertical, Trash2, Eye, Filter, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TagBadge } from "./tag-badge";
import { useState } from "react";
import type { Tag } from "./tag-selector-dialog";

interface Document {
  id: string;
  name: string;
  size: string;
  status: "processing" | "ready" | "failed";
  uploadedAt: Date;
  tags: string[];
}

interface DocumentListProps {
  documents: Document[];
  tags: Tag[];
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
}

export function DocumentList({ documents, tags, onDelete, onView }: DocumentListProps) {
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const getStatusColor = (status: Document["status"]) => {
    switch (status) {
      case "ready":
        return "default";
      case "processing":
        return "secondary";
      case "failed":
        return "destructive";
    }
  };

  const getTagById = (tagId: string) => tags.find((t) => t.id === tagId);

  const filteredDocuments = selectedTagFilter
    ? documents.filter((doc) => doc.tags.includes(selectedTagFilter))
    : documents;

  const availableTags = tags.filter((tag) =>
    documents.some((doc) => doc.tags.includes(tag.id))
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Uploaded Documents</CardTitle>
          {availableTags.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() =>
                      setSelectedTagFilter(selectedTagFilter === tag.id ? null : tag.id)
                    }
                    className={`transition-opacity ${
                      selectedTagFilter === tag.id
                        ? "opacity-100 ring-2 ring-offset-2 ring-primary rounded"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <TagBadge name={tag.name} color={tag.color} />
                  </button>
                ))}
                {selectedTagFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTagFilter(null)}
                    className="h-6 px-2"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {filteredDocuments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {selectedTagFilter ? "No documents with this tag" : "No documents uploaded yet"}
            </div>
          )}
          {filteredDocuments.map((doc, index) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 rounded-lg border hover-elevate"
              data-testid={`document-${index}`}
            >
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground">{doc.size}</p>
                  {doc.tags.length > 0 && (
                    <>
                      <span className="text-xs text-muted-foreground">•</span>
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.map((tagId) => {
                          const tag = getTagById(tagId);
                          return tag ? (
                            <TagBadge
                              key={tagId}
                              name={tag.name}
                              color={tag.color}
                              className="text-xs"
                            />
                          ) : null;
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <Badge variant={getStatusColor(doc.status)}>
                {doc.status}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid={`button-document-menu-${index}`}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onView && (
                    <DropdownMenuItem onClick={() => onView(doc.id)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={() => onDelete(doc.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
