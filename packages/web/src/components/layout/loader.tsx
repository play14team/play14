"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { HashLoader } from "react-spinners"
import styles from "./loader.module.css"

const Loader = (props: { size?: string }) => {
  const { size } = props
  const style = size ? { minHeight: size } : {}
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Use brand orange, adjusted for better visibility in dark mode
  const color = mounted && resolvedTheme === "dark" ? "#ff6b2c" : "#FF5200"

  return (
    <div className={styles.loader} style={style} role="status" aria-label="Loading">
      <HashLoader color={color} />
    </div>
  )
}

export default Loader
