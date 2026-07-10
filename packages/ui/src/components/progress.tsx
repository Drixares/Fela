"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

import { cn } from "@repo/ui/lib/utils";

function Progress({
  className,
  indicatorClassName,
  ...props
}: ProgressPrimitive.Root.Props & { indicatorClassName?: string }) {
  return (
    <ProgressPrimitive.Root data-slot="progress" {...props}>
      <ProgressPrimitive.Track
        data-slot="progress-track"
        className={cn(
          "block h-2 w-full overflow-hidden rounded-full bg-primary/20",
          className
        )}
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className={cn(
            "block h-full rounded-full bg-primary transition-all",
            indicatorClassName
          )}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}

export { Progress };
