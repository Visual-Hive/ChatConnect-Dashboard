import { StatsCard } from "@/components/stats-card";
import { ActivityFeed } from "@/components/activity-feed";
import { SetupProgress } from "@/components/setup-progress";
import { MessageSquare, Users, ThumbsUp, DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Overview() {
  const [, setLocation] = useLocation();

  const setupSteps = [
    {
      id: "brand",
      title: "Configure Brand Settings",
      description: "Set your logo, colors, and welcome message",
      completed: false,
    },
    {
      id: "knowledge",
      title: "Upload Knowledge Base",
      description: "Add documents for AI to reference",
      completed: false,
    },
    {
      id: "widget",
      title: "Install Widget Code",
      description: "Add the widget to your conference site",
      completed: false,
    },
    {
      id: "test",
      title: "Test Your Widget",
      description: "Try out the chat experience",
      completed: false,
    },
  ];

  const activities = [
    {
      id: "1",
      user: "Sarah Johnson",
      action: "asked",
      message: "When does the keynote start?",
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
    },
    {
      id: "2",
      user: "Mike Chen",
      action: "asked",
      message: "Where is the workshop room?",
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
    },
    {
      id: "3",
      user: "Emma Davis",
      action: "asked",
      message: "How do I access the conference app?",
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
    },
    {
      id: "4",
      user: "Alex Thompson",
      action: "asked",
      message: "What's the WiFi password?",
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
    },
  ];

  const handleStepClick = (stepId: string) => {
    if (stepId === "brand" || stepId === "widget") {
      setLocation("/widget");
    } else if (stepId === "knowledge") {
      setLocation("/knowledge");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here's what's happening with your chat widget.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Messages"
          value="2,847"
          icon={MessageSquare}
          change={{ value: 12.5, isPositive: true }}
          testId="stat-messages"
        />
        <StatsCard
          title="Active Sessions"
          value="342"
          icon={Users}
          change={{ value: 8.2, isPositive: true }}
          testId="stat-sessions"
        />
        <StatsCard
          title="Response Quality"
          value="4.8/5"
          icon={ThumbsUp}
          change={{ value: 2.1, isPositive: true }}
          testId="stat-quality"
        />
        <StatsCard
          title="Token Costs"
          value="$127.45"
          icon={DollarSign}
          change={{ value: 5.3, isPositive: false }}
          testId="stat-costs"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SetupProgress steps={setupSteps} onStepClick={handleStepClick} />
        <ActivityFeed activities={activities} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Get Started</CardTitle>
          <CardDescription>
            Complete the setup steps above to activate your chat widget
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button onClick={() => setLocation("/widget")} data-testid="button-configure-widget">
              Configure Widget
            </Button>
            <Button variant="outline" onClick={() => setLocation("/knowledge")} data-testid="button-upload-knowledge">
              Upload Knowledge Base
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
