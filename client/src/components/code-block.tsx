import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = "html" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="bg-muted">
      <CardContent className="p-4">
        <div className="relative">
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-0 right-0"
            onClick={handleCopy}
            data-testid="button-copy-code"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          <pre className="overflow-x-auto text-sm">
            <code className="font-mono text-foreground">{code}</code>
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
