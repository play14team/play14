"use client"

import clsx from "clsx"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useState } from "react"
import { Link, usePathname } from "@/i18n/navigation"
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
import LocaleSwitcher from "./locale-switcher"
import Logo from "./logo"
import SearchBox from "./searchbox"
import ThemeToggle from "./theme-toggle"

function useNavigationItems(): NavItem[] {
  const t = useTranslations("nav")

  return [
    {
      label: t("home"),
      href: "/",
      items: [
        { label: t("home"), href: "/" },
        { label: t("powerOfPlay"), href: "/#power-of-play" },
        { label: t("upcomingEvents"), href: "/#upcoming-events" },
        { label: t("statistics"), href: "/#statistics" },
        { label: t("worldMap"), href: "/#world-map" },
        { label: t("theExperience"), href: "/#activities" },
        { label: t("manifestoAndCodeOfConduct"), href: "/#manifesto-and-code-of-conduct" },
        { label: t("testimonials"), href: "/#testimonials" },
        { label: t("gallery"), href: "/#gallery" },
        { label: t("benefits"), href: "/#benefits" },
        { label: t("faq"), href: "/#faq" },
      ],
    },
    {
      label: t("events"),
      href: "/events",
      items: [
        { label: t("events"), href: "/events" },
        { label: t("gallery"), href: "/events/gallery" },
        { label: t("calendar"), href: "/events/calendar" },
        { label: t("map"), href: "/events/map" },
        { label: t("hostingAnEvent"), href: "/events/hosting" },
      ],
    },
    {
      label: t("community"),
      href: "/community",
      items: [
        { label: t("players"), href: "/players" },
        { label: t("games"), href: "/games" },
        { label: t("articles"), href: "/articles" },
        { label: t("testimonials"), href: "/events/testimonials" },
        { label: t("thingsWeLike"), href: "/likes" },
        { label: t("debriefingCube"), href: "/tools/debriefing-cube" },
      ],
    },
    {
      label: t("about"),
      href: "/about",
      items: [
        { label: t("ourStory"), href: "/about/story" },
        { label: t("ourValues"), href: "/about/values" },
        { label: t("ourFormat"), href: "/about/format" },
      ],
    },
    {
      label: t("contact"),
      href: "/contact",
      items: null,
    },
  ]
}

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
  const navigationItems = useNavigationItems()

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
                    <NavigationMenuItem key={item.href}>
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
                    <NavigationMenuItem key={item.href}>
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
              <LocaleSwitcher />
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
