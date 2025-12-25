"use client"

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import clsx from "clsx"
import React from "react"

// Root
export const DropdownMenu = DropdownMenuPrimitive.Root

// Trigger
export const DropdownMenuTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Trigger
    ref={ref}
    className={clsx("ui-dropdown-trigger", className)}
    {...props}
  />
))
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

// Content
export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={clsx("ui-dropdown-content", className)}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = "DropdownMenuContent"

// Item
export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    destructive?: boolean
  }
>(({ className, destructive, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={clsx(
      "ui-dropdown-item",
      destructive && "ui-dropdown-item-destructive",
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = "DropdownMenuItem"

// Label
export const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={clsx("ui-dropdown-label", className)}
    {...props}
  />
))
DropdownMenuLabel.displayName = "DropdownMenuLabel"

// Separator
export const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={clsx("ui-dropdown-separator", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

// Arrow
export const DropdownMenuArrow = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Arrow>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Arrow>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Arrow
    ref={ref}
    className={clsx("ui-dropdown-arrow", className)}
    {...props}
  />
))
DropdownMenuArrow.displayName = "DropdownMenuArrow"
