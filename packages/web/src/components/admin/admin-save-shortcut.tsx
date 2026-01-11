"use client"

import { useEffect } from "react"

const SAVE_SELECTOR = "[data-save-shortcut]"
const ENABLED_SAVE_SELECTOR = `${SAVE_SELECTOR}:not([disabled])`

type SaveRoot = Document | Element

const isVisible = (target: HTMLElement) => target.getClientRects().length > 0

const findSaveTarget = (root: SaveRoot | null) => {
  if (!root) return null
  const targets = Array.from(root.querySelectorAll(ENABLED_SAVE_SELECTOR))
  for (const target of targets) {
    if (target instanceof HTMLElement && isVisible(target)) {
      return target
    }
  }
  return null
}

const triggerSave = (target: HTMLElement) => {
  if (target instanceof HTMLButtonElement) {
    if (target.type === "submit") {
      const form = target.form ?? target.closest("form")
      if (form) {
        form.requestSubmit(target)
        return
      }
    }
    target.click()
    return
  }

  if (target instanceof HTMLInputElement) {
    if (target.type === "submit") {
      const form = target.form ?? target.closest("form")
      if (form) {
        form.requestSubmit(target)
        return
      }
    }
    target.click()
    return
  }

  target.click()
}

export default function AdminSaveShortcut() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (!(event.metaKey || event.ctrlKey)) return
      if (event.key.toLowerCase() !== "s") return

      const activeElement = document.activeElement as HTMLElement | null
      const focusedForm =
        activeElement?.closest("form") ?? document.querySelector("form:focus-within")
      const focusedDialog =
        activeElement?.closest("dialog[open]") ?? document.querySelector("dialog[open]")
      const saveTarget =
        findSaveTarget(focusedForm) ??
        findSaveTarget(focusedDialog) ??
        findSaveTarget(document)

      if (!saveTarget) return

      event.preventDefault()
      triggerSave(saveTarget)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return null
}
