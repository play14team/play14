"use client"

import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu"
import clsx from "clsx"
import React from "react"

// Root
export const NavigationMenu = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Root
    ref={ref}
    className={clsx("ui-navigation-menu", className)}
    {...props}
  >
    {children}
  </NavigationMenuPrimitive.Root>
))
NavigationMenu.displayName = "NavigationMenu"

// List
export const NavigationMenuList = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.List
    ref={ref}
    className={clsx("ui-navigation-menu-list", className)}
    {...props}
  />
))
NavigationMenuList.displayName = "NavigationMenuList"

// Item
export const NavigationMenuItem = NavigationMenuPrimitive.Item

// Trigger
export const NavigationMenuTrigger = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Trigger
    ref={ref}
    className={clsx("ui-navigation-menu-trigger", className)}
    {...props}
  >
    {children}
    <i className="bx bx-chevron-down ui-navigation-menu-chevron" aria-hidden="true" />
  </NavigationMenuPrimitive.Trigger>
))
NavigationMenuTrigger.displayName = "NavigationMenuTrigger"

// Content
export const NavigationMenuContent = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Content
    ref={ref}
    className={clsx("ui-navigation-menu-content", className)}
    forceMount={undefined}
    {...props}
  />
))
NavigationMenuContent.displayName = "NavigationMenuContent"

// Link
export const NavigationMenuLink = NavigationMenuPrimitive.Link
