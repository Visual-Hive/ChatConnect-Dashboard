import { MessagesChart, PeakHoursChart } from "../analytics-charts";

export default function AnalyticsChartsExample() {
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

  return (
    <div className="p-6 space-y-6">
      <MessagesChart data={messagesData} />
      <PeakHoursChart data={peakHoursData} />
    </div>
  );
}
