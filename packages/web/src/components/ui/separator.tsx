"use client"

import * as SeparatorPrimitive from "@radix-ui/react-separator"
import clsx from "clsx"
import React from "react"

interface SeparatorProps extends React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root> {
  orientation?: "horizontal" | "vertical"
}

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  SeparatorProps
>(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={clsx(
      "ui-separator",
      orientation === "horizontal" ? "ui-separator-horizontal" : "ui-separator-vertical",
      className
    )}
    {...props}
  />
))
Separator.displayName = "Separator"

export default Separator
