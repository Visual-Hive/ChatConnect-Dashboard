import { TimeRangeSelector } from "../time-range-selector";
import { useState } from "react";

export default function TimeRangeSelectorExample() {
  const [range, setRange] = useState<"7d" | "30d" | "3m">("7d");

  return (
    <div className="p-6">
      <TimeRangeSelector value={range} onChange={setRange} />
    </div>
  );
}
