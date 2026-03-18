import type { MDXRemoteProps } from "next-mdx-remote/rsc"
import CodeOfConduct from "@/components/layout/codeofconduct"
import { Link } from "@/i18n/navigation"
import styles from "./hosting.module.scss"

function Lead({ children }: { children: React.ReactNode }) {
  return <div className={styles.lead}>{children}</div>
}

function PartDivider({ children }: { children: React.ReactNode }) {
  return <div className={styles.partDivider}>{children}</div>
}

function Section({
  id,
  className,
  children,
}: {
  id?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className={className ?? "pt-70"}>
      {children}
    </section>
  )
}

function SuccessFactors({ children }: { children: React.ReactNode }) {
  return <div className={styles.successFactors}>{children}</div>
}

function ChecklistSection({ children }: { children: React.ReactNode }) {
  return <div className={styles.checklistSection}>{children}</div>
}

function Inspiration({ children }: { children: React.ReactNode }) {
  return <div className={styles.inspiration}>{children}</div>
}

function Background({ children }: { children: React.ReactNode }) {
  return <div className={styles.background}>{children}</div>
}

function Attribution({ children }: { children: React.ReactNode }) {
  return <div className={styles.attribution}>{children}</div>
}

function Checklist({ children }: { children: React.ReactNode }) {
  return <div className={styles.checklist}>{children}</div>
}

function Principles({ children }: { children: React.ReactNode }) {
  return <div className={styles.principles}>{children}</div>
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="row">{children}</div>
}

function Col({ lg, md, children }: { lg?: number; md?: number; children: React.ReactNode }) {
  const classes = [lg && `col-lg-${lg}`, md && `col-md-${md}`].filter(Boolean).join(" ")
  return <div className={classes}>{children}</div>
}

export function getMDXComponents(): MDXRemoteProps["components"] {
  return {
    a: ({ href, children, ...props }: React.ComponentProps<"a">) => {
      if (href?.startsWith("/") || href?.startsWith("#")) {
        return (
          <Link href={href} {...props}>
            {children}
          </Link>
        )
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      )
    },
    Lead,
    PartDivider,
    Section,
    SuccessFactors,
    ChecklistSection,
    Inspiration,
    Background,
    Attribution,
    Checklist,
    Principles,
    Row,
    Col,
    CodeOfConduct,
  }
}
