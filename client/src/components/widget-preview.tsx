import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Send, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface WidgetConfig {
  primaryColor: string;
  widgetName: string;
  welcomeMessage: string;
  position: "bottom-left" | "bottom-right";
}

interface WidgetPreviewProps {
  config: WidgetConfig;
}

export function WidgetPreview({ config }: WidgetPreviewProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Live Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-video rounded-lg border-2 border-border bg-muted/20 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            Conference Website Preview
          </div>

          <div
            className={cn(
              "absolute bottom-6 flex flex-col gap-2",
              config.position === "bottom-right" ? "right-6" : "left-6"
            )}
            data-testid="widget-preview"
          >
            {isOpen && (
              <Card className="w-80 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between p-4 space-y-0" style={{ backgroundColor: config.primaryColor }}>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-white" />
                    <span className="font-semibold text-white">{config.widgetName}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-white/20 text-white"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm">{config.welcomeMessage}</p>
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Type your message..." className="flex-1" />
                    <Button size="icon" style={{ backgroundColor: config.primaryColor }}>
                      <Send className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {!isOpen && (
              <Button
                size="icon"
                className="h-14 w-14 rounded-full shadow-lg"
                style={{ backgroundColor: config.primaryColor }}
                onClick={() => setIsOpen(true)}
              >
                <MessageSquare className="h-6 w-6 text-white" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
