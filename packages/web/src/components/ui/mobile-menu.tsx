"use client"

import * as Collapsible from "@radix-ui/react-collapsible"
import * as Dialog from "@radix-ui/react-dialog"
import clsx from "clsx"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useState } from "react"

export interface NavItem {
  label: string
  href: string
  items?: { label: string; href: string }[] | null
}

interface MobileMenuProps {
  items: NavItem[]
}

interface MobileNavLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  onNavigate: () => void
}

function MobileNavLink({ href, children, className, onNavigate }: MobileNavLinkProps) {
  const pathname = usePathname()

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Check if this is an anchor link on the current page
      if (href.startsWith("/#") && pathname === "/") {
        e.preventDefault()
        const targetId = href.slice(2) // Remove "/#"
        const element = document.getElementById(targetId)
        if (element) {
          element.scrollIntoView({ behavior: "smooth" })
        }
        onNavigate()
      } else if (href === "/" && pathname === "/") {
        e.preventDefault()
        window.scrollTo({ top: 0, behavior: "smooth" })
        onNavigate()
      } else {
        onNavigate()
      }
    },
    [href, pathname, onNavigate]
  )

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  )
}

export function MobileMenu({ items }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [openSections, setOpenSections] = useState<string[]>([])

  const toggleSection = (label: string) => {
    setOpenSections((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    )
  }

  const handleLinkClick = useCallback(() => {
    setIsOpen(false)
    setOpenSections([])
  }, [])

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <button
          className={clsx("ui-mobile-menu-trigger", isOpen && "is-open")}
          aria-label="Toggle navigation menu"
        >
          <span className="ui-mobile-menu-bar top-bar" />
          <span className="ui-mobile-menu-bar middle-bar" />
          <span className="ui-mobile-menu-bar bottom-bar" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="ui-mobile-menu-overlay" />
        <Dialog.Content className="ui-mobile-menu-content">
          <Dialog.Title className="sr-only">Navigation menu</Dialog.Title>
          <Dialog.Description className="sr-only">
            Primary site navigation and sign-in links
          </Dialog.Description>

          <div className="ui-mobile-menu-header">
            <Dialog.Close asChild>
              <button className="ui-mobile-menu-close" aria-label="Close menu">
                <i className="bx bx-x" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <nav className="ui-mobile-menu-nav">
            {items.map((item) =>
              item.items ? (
                <Collapsible.Root
                  key={item.label}
                  open={openSections.includes(item.label)}
                  onOpenChange={() => toggleSection(item.label)}
                >
                  <Collapsible.Trigger className="ui-mobile-menu-section-trigger">
                    <span>{item.label}</span>
                    <i
                      className={clsx(
                        "bx bx-chevron-down ui-mobile-menu-chevron",
                        openSections.includes(item.label) && "is-open"
                      )}
                      aria-hidden="true"
                    />
                  </Collapsible.Trigger>
                  <Collapsible.Content className="ui-mobile-menu-section-content">
                    {item.items.map((subItem) => (
                      <MobileNavLink
                        key={subItem.href}
                        href={subItem.href}
                        className="ui-mobile-menu-link"
                        onNavigate={handleLinkClick}
                      >
                        {subItem.label}
                      </MobileNavLink>
                    ))}
                  </Collapsible.Content>
                </Collapsible.Root>
              ) : (
                <MobileNavLink
                  key={item.label}
                  href={item.href}
                  className="ui-mobile-menu-link ui-mobile-menu-link-primary"
                  onNavigate={handleLinkClick}
                >
                  {item.label}
                </MobileNavLink>
              )
            )}
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
