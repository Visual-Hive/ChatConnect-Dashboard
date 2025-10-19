import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ColorPicker } from "@/components/color-picker";
import { WidgetPreview } from "@/components/widget-preview";
import { CodeBlock } from "@/components/code-block";
import { Upload, Code } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function WidgetConfig() {
  const { toast } = useToast();
  const { client } = useAuth();
  const queryClient = useQueryClient();
  const [widgetName, setWidgetName] = useState("Support");
  const [welcomeMessage, setWelcomeMessage] = useState("Hi! How can I help?");
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [position, setPosition] = useState<"bottom-left" | "bottom-right">("bottom-right");
  const [requireLogin, setRequireLogin] = useState(false);
  const [enableFeedback, setEnableFeedback] = useState(true);
  const [showTyping, setShowTyping] = useState(true);
  const [showCode, setShowCode] = useState(false);

  // Fetch widget configuration
  const { data: widgetConfig, isLoading } = useQuery({
    queryKey: ["widget", client?.id],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/widget/${client?.id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch widget config");
      return response.json();
    },
    enabled: !!client?.id,
  });

  // Update local state when config loads
  useEffect(() => {
    if (widgetConfig) {
      setWidgetName(widgetConfig.widgetName || "Support");
      setWelcomeMessage(widgetConfig.welcomeMessage || "Hi! How can I help?");
      setPrimaryColor(widgetConfig.primaryColor || "#3b82f6");
      setPosition(widgetConfig.position || "bottom-right");
    }
  }, [widgetConfig]);

  // Mutation to save widget configuration
  const saveConfigMutation = useMutation({
    mutationFn: async (config: {
      widgetName: string;
      welcomeMessage: string;
      primaryColor: string;
      position: "bottom-left" | "bottom-right";
    }) => {
      const response = await fetch(`/api/dashboard/widget/${client?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error("Failed to save widget config");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["widget", client?.id] });
      toast({
        title: "Settings saved",
        description: "Your widget configuration has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save widget configuration.",
        variant: "destructive",
      });
    },
  });

  const widgetCode = `<script>
  window.ConferenceChatConfig = {
    apiKey: '${client?.publicApiKey || 'YOUR_API_KEY'}',
    baseUrl: '${window.location.origin}/api/widget'
  };
</script>
<script src="${window.location.origin}/widget/v1/widget.js"></script>`;

  const handleSave = () => {
    saveConfigMutation.mutate({
      widgetName,
      welcomeMessage,
      primaryColor,
      position,
    });
  };

  const handleGenerateCode = () => {
    setShowCode(true);
    toast({
      title: "Widget code generated",
      description: "Copy the code below and paste it into your website.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Widget Configuration</h1>
        <p className="text-muted-foreground mt-1">
          Customize your chat widget's appearance and behavior
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Brand Settings</CardTitle>
              <CardDescription>Configure your widget's visual identity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logo">Logo</Label>
                <div className="flex gap-2">
                  <Input id="logo" type="file" accept="image/*" data-testid="input-logo" />
                  <Button variant="outline" size="icon">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <ColorPicker
                label="Primary Color"
                color={primaryColor}
                onChange={setPrimaryColor}
              />

              <div className="space-y-2">
                <Label htmlFor="widget-name">Widget Name</Label>
                <Input
                  id="widget-name"
                  value={widgetName}
                  onChange={(e) => setWidgetName(e.target.value)}
                  placeholder="e.g., Conference Support"
                  data-testid="input-widget-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcome-message">Welcome Message</Label>
                <Textarea
                  id="welcome-message"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder="Enter a friendly greeting..."
                  rows={3}
                  data-testid="input-welcome-message"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Position & Features</CardTitle>
              <CardDescription>Configure widget placement and capabilities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Widget Position</Label>
                <div className="flex gap-2">
                  <Button
                    variant={position === "bottom-left" ? "default" : "outline"}
                    onClick={() => setPosition("bottom-left")}
                    className="flex-1"
                    data-testid="button-position-left"
                  >
                    Bottom Left
                  </Button>
                  <Button
                    variant={position === "bottom-right" ? "default" : "outline"}
                    onClick={() => setPosition("bottom-right")}
                    className="flex-1"
                    data-testid="button-position-right"
                  >
                    Bottom Right
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Login</Label>
                  <p className="text-sm text-muted-foreground">
                    Users must sign in to chat
                  </p>
                </div>
                <Switch
                  checked={requireLogin}
                  onCheckedChange={setRequireLogin}
                  data-testid="switch-require-login"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Feedback</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to rate responses
                  </p>
                </div>
                <Switch
                  checked={enableFeedback}
                  onCheckedChange={setEnableFeedback}
                  data-testid="switch-enable-feedback"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Typing Indicator</Label>
                  <p className="text-sm text-muted-foreground">
                    Display when AI is typing
                  </p>
                </div>
                <Switch
                  checked={showTyping}
                  onCheckedChange={setShowTyping}
                  data-testid="switch-show-typing"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={handleSave} data-testid="button-save-config">
              Save Configuration
            </Button>
            <Button variant="outline" onClick={handleGenerateCode} data-testid="button-generate-code">
              <Code className="h-4 w-4 mr-2" />
              Generate Widget Code
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <WidgetPreview
            config={{
              primaryColor,
              widgetName,
              welcomeMessage,
              position,
            }}
          />

          {showCode && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Installation Code</h3>
              <p className="text-sm text-muted-foreground">
                Copy this code and paste it before the closing {'</body>'} tag on your website
              </p>
              <CodeBlock code={widgetCode} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
