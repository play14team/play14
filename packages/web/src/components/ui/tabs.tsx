"use client"

import * as TabsPrimitive from "@radix-ui/react-tabs"
import clsx from "clsx"
import React from "react"

// Root
export const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Root ref={ref} className={clsx("ui-tabs", className)} {...props} />
))
Tabs.displayName = "Tabs"

// TabsList
export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List ref={ref} className={clsx("ui-tabs-list", className)} {...props} />
))
TabsList.displayName = "TabsList"

// TabsTrigger
export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger ref={ref} className={clsx("ui-tabs-trigger", className)} {...props} />
))
TabsTrigger.displayName = "TabsTrigger"

// TabsContent
export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={clsx("ui-tabs-content", className)} {...props} />
))
TabsContent.displayName = "TabsContent"
