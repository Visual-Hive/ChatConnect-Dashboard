import { StatsCard } from "../stats-card";
import { MessageSquare } from "lucide-react";

export default function StatsCardExample() {
  return (
    <div className="p-6">
      <StatsCard
        title="Total Messages"
        value="2,847"
        icon={MessageSquare}
        change={{ value: 12.5, isPositive: true }}
      />
    </div>
  );
}
