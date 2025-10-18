import { ColorPicker } from "../color-picker";
import { useState } from "react";

export default function ColorPickerExample() {
  const [color, setColor] = useState("#3b82f6");

  return (
    <div className="p-6 max-w-sm">
      <ColorPicker color={color} onChange={setColor} label="Primary Color" />
    </div>
  );
}
