import { ActivityFeed } from "../activity-feed";

export default function ActivityFeedExample() {
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
  ];

  return <ActivityFeed activities={activities} />;
}
