import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeRangeSelector } from "@/components/time-range-selector";
import { MessagesChart, PeakHoursChart } from "@/components/analytics-charts";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "3m">("7d");

  const messagesData = [
    { date: "Mon", messages: 45 },
    { date: "Tue", messages: 67 },
    { date: "Wed", messages: 89 },
    { date: "Thu", messages: 123 },
    { date: "Fri", messages: 156 },
    { date: "Sat", messages: 98 },
    { date: "Sun", messages: 72 },
  ];

  const peakHoursData = [
    { hour: "9am", conversations: 12 },
    { hour: "10am", conversations: 28 },
    { hour: "11am", conversations: 45 },
    { hour: "12pm", conversations: 38 },
    { hour: "1pm", conversations: 52 },
    { hour: "2pm", conversations: 61 },
    { hour: "3pm", conversations: 43 },
    { hour: "4pm", conversations: 35 },
  ];

  const popularQuestions = [
    { question: "When does the keynote start?", count: 87 },
    { question: "Where is the registration desk?", count: 65 },
    { question: "What's the WiFi password?", count: 54 },
    { question: "How do I access the conference app?", count: 43 },
    { question: "Where can I find lunch?", count: 38 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track usage, quality metrics, and costs
          </p>
        </div>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <MessagesChart data={messagesData} />
        <PeakHoursChart data={peakHoursData} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quality Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Average Rating</p>
                <p className="text-2xl font-semibold">4.8/5.0</p>
              </div>
              <div className="flex items-center gap-1 text-sm text-chart-2">
                <TrendingUp className="h-4 w-4" />
                <span>+0.3</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Response Rate</p>
                <p className="text-2xl font-semibold">98.5%</p>
              </div>
              <div className="flex items-center gap-1 text-sm text-chart-2">
                <TrendingUp className="h-4 w-4" />
                <span>+1.2%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Avg. Response Time</p>
                <p className="text-2xl font-semibold">1.2s</p>
              </div>
              <div className="flex items-center gap-1 text-sm text-destructive">
                <TrendingDown className="h-4 w-4" />
                <span>+0.3s</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cost Tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Monthly Spend</p>
                <p className="text-2xl font-semibold">$127.45</p>
              </div>
              <Badge variant="secondary">15% of budget</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Cost per Conversation</p>
                <p className="text-2xl font-semibold">$0.37</p>
              </div>
              <div className="flex items-center gap-1 text-sm text-chart-2">
                <TrendingUp className="h-4 w-4" />
                <span>-$0.05</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Total Tokens Used</p>
                <p className="text-2xl font-semibold">345K</p>
              </div>
              <Badge>Within limits</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Popular Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {popularQuestions.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border"
                data-testid={`question-${index}`}
              >
                <p className="text-sm font-medium">{item.question}</p>
                <Badge variant="secondary">{item.count} asks</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
