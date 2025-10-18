import { SetupProgress } from "../setup-progress";

export default function SetupProgressExample() {
  const steps = [
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

  return (
    <SetupProgress
      steps={steps}
      onStepClick={(id) => console.log("Step clicked:", id)}
    />
  );
}
