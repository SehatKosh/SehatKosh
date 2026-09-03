import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-blue-600 active:bg-blue-700 shadow-sm",
        destructive:
          "bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-sm",
        outline:
          "border border-border bg-white text-foreground hover:bg-slate-50 active:bg-slate-100 shadow-sm",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-slate-200 active:bg-slate-300",
        ghost:
          "hover:bg-accent hover:text-accent-foreground active:bg-slate-100",
        link: "text-primary underline-offset-4 hover:underline",
        success:
          "bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-sm",
        warning:
          "bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700 shadow-sm",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-6 text-base",
        icon: "h-9 w-9",
        "icon-sm": "h-7 w-7",
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
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
