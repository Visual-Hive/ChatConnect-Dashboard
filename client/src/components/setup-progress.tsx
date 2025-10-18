import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

interface SetupProgressProps {
  steps: Step[];
  onStepClick?: (stepId: string) => void;
}

export function SetupProgress({ steps, onStepClick }: SetupProgressProps) {
  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Setup Progress</CardTitle>
        <CardDescription>
          {completedCount} of {totalCount} steps completed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="flex items-start gap-3"
            data-testid={`setup-step-${index}`}
          >
            <div
              className={cn(
                "mt-0.5 flex h-6 w-6 items-center justify-center rounded-full",
                step.completed
                  ? "bg-primary text-primary-foreground"
                  : "border-2 border-border"
              )}
            >
              {step.completed ? (
                <Check className="h-4 w-4" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">{step.title}</p>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
            {!step.completed && onStepClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStepClick(step.id)}
                data-testid={`button-setup-${step.id}`}
              >
                Start
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
