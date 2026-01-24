"use client"

import type { PropsWithChildren, ReactNode } from "react"
import { useCollapse } from "react-collapsed"
import "./collapsible.module.scss"

interface CollapsibleProps extends PropsWithChildren {
  name: ReactNode
}

export default function Collapsible({ name, children }: CollapsibleProps) {
  const { getCollapseProps, getToggleProps, isExpanded } = useCollapse()
  return (
    <div className="collapsible">
      <button className="header" {...getToggleProps()} aria-expanded={isExpanded} type="button">
        <span className="collapsible-title">{name}</span>
        <span className="collapsible-icon">
          <i className={`bx ${isExpanded ? "bx-filter" : "bx-filter-alt"}`} aria-hidden="true" />
        </span>
      </button>
      <div {...getCollapseProps()}>
        <div className="content pb-70">{children}</div>
      </div>
    </div>
  )
}
