import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  indeterminate?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, indeterminate = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative h-1 w-full overflow-hidden rounded-sm bg-muted",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full bg-primary transition-all duration-300 ease-in-out",
            indeterminate && "w-[30%] animate-indeterminate"
          )}
          style={!indeterminate ? { width: `${value}%` } : undefined}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
