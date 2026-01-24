"use client"

import * as TabsPrimitive from "@radix-ui/react-tabs"
import clsx from "clsx"
import type { ComponentPropsWithoutRef, ElementRef } from "react"
import { forwardRef } from "react"

const Tabs = TabsPrimitive.Root

const TabsList = forwardRef<
  ElementRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List ref={ref} className={clsx("ui-tabs-list", className)} {...props} />
))
TabsList.displayName = TabsPrimitive.List.displayName

interface TabsTriggerProps extends ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  badge?: number | string
}

const TabsTrigger = forwardRef<ElementRef<typeof TabsPrimitive.Trigger>, TabsTriggerProps>(
  ({ className, children, badge, ...props }, ref) => (
    <TabsPrimitive.Trigger ref={ref} className={clsx("ui-tabs-trigger", className)} {...props}>
      {children}
      {badge !== undefined && badge !== 0 && <span className="ui-tabs-badge">{badge}</span>}
    </TabsPrimitive.Trigger>
  )
)
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={clsx("ui-tabs-content", className)} {...props} />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsContent, TabsList, TabsTrigger }
