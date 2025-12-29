import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer border rounded-[2px]",
  {
    variants: {
      variant: {
        default:
          "bg-accent-dark border-accent-dark text-white hover:bg-accent hover:border-accent",
        destructive:
          "bg-destructive border-destructive text-white hover:brightness-110",
        outline:
          "border-border bg-transparent text-foreground hover:bg-secondary hover:border-accent",
        secondary:
          "bg-secondary border-secondary text-foreground hover:bg-muted",
        ghost: "border-transparent hover:bg-secondary",
        link: "border-transparent text-accent-light p-0 min-w-0 min-h-0 hover:underline",
      },
      size: {
        default: "min-h-[32px] min-w-[100px] px-4",
        sm: "h-7 px-3 text-xs",
        lg: "h-10 px-6",
        icon: "h-8 w-8 min-w-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
