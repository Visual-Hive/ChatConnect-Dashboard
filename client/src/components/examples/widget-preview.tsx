import { WidgetPreview } from "../widget-preview";

export default function WidgetPreviewExample() {
  return (
    <WidgetPreview
      config={{
        primaryColor: "#3b82f6",
        widgetName: "Conference Support",
        welcomeMessage: "Hi! How can I help you today?",
        position: "bottom-right",
      }}
    />
  );
}
