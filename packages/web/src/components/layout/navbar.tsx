"use client"

import clsx from "clsx"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { MobileMenu, type NavItem } from "../ui/mobile-menu"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "../ui/navigation-menu"
import AuthStatusClient from "./auth-status-client"
import Logo from "./logo"
import SearchBox from "./searchbox"
import ThemeToggle from "./theme-toggle"

const navigationItems: NavItem[] = [
  {
    label: "Home",
    href: "/",
    items: [
      { label: "Home", href: "/" },
      { label: "Power of play", href: "/#power-of-play" },
      { label: "Upcoming events", href: "/#upcoming-events" },
      { label: "Statistics", href: "/#statistics" },
      { label: "World map", href: "/#world-map" },
      { label: "The experience", href: "/#activities" },
      { label: "Manifesto & code of conduct", href: "/#manifesto-and-code-of-conduct" },
      { label: "Testimonials", href: "/#testimonials" },
      { label: "Gallery", href: "/#gallery" },
      { label: "Benefits", href: "/#benefits" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    label: "Events",
    href: "/events",
    items: [
      { label: "Events", href: "/events" },
      { label: "Calendar", href: "/events/calendar" },
      { label: "Map", href: "/events/map" },
      { label: "Hosting an event", href: "/events/hosting" },
    ],
  },
  {
    label: "Community",
    href: "/community",
    items: [
      { label: "Players", href: "/players" },
      { label: "Games", href: "/games" },
      { label: "Articles", href: "/articles" },
      { label: "Testimonials", href: "/events/testimonials" },
      { label: "Things we like", href: "/likes" },
    ],
  },
  {
    label: "About",
    href: "/about",
    items: [
      { label: "Our story", href: "/about/story" },
      { label: "Our values", href: "/about/values" },
      { label: "Our format", href: "/about/format" },
    ],
  },
  {
    label: "Contact",
    href: "/contact",
    items: null,
  },
]

interface NavLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

function NavLink({ href, children, className }: NavLinkProps) {
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
      } else if (href === "/" && pathname === "/") {
        e.preventDefault()
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    },
    [href, pathname]
  )

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  )
}

export default function Navbar() {
  const [isSticky, setIsSticky] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 170)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header id="navbar" className={clsx("navbar-area", isSticky && "is-sticky")}>
      <div className="tarn-nav">
        <div className="container">
          <nav className="ui-navbar">
            <Link href="/" className="navbar-brand">
              <Logo width={180} height={60} priority />
            </Link>

            <NavigationMenu>
              <NavigationMenuList>
                {navigationItems.map((item) =>
                  item.items ? (
                    <NavigationMenuItem key={item.label}>
                      <NavigationMenuTrigger>{item.label}</NavigationMenuTrigger>
                      <NavigationMenuContent>
                        {item.items.map((subItem) => (
                          <NavigationMenuLink key={subItem.href} asChild>
                            <NavLink href={subItem.href}>{subItem.label}</NavLink>
                          </NavigationMenuLink>
                        ))}
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  ) : (
                    <NavigationMenuItem key={item.label}>
                      <NavigationMenuLink asChild>
                        <NavLink href={item.href} className="ui-navigation-menu-link">
                          {item.label}
                        </NavLink>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  )
                )}
              </NavigationMenuList>
            </NavigationMenu>

            <div className="ui-navbar-actions">
              <SearchBox />
              <ThemeToggle />
              <AuthStatusClient />
            </div>

            <MobileMenu items={navigationItems} />
          </nav>
        </div>
      </div>
    </header>
  )
}
