import { useCallback, useRef, useState } from "react"

export const useIntersection = (rootMargin = "0px"): [boolean, (node: Element | null) => void] => {
  const [isVisible, setIsVisible] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const ref = useCallback(
    (node: Element | null) => {
      // Disconnect previous observer
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }

      if (node) {
        const observer = new IntersectionObserver(
          ([entry]) => {
            setIsVisible(entry.isIntersecting)
          },
          { rootMargin, threshold: 0 }
        )
        observer.observe(node)
        observerRef.current = observer
      } else {
        setIsVisible(false)
      }
    },
    [rootMargin]
  )

  return [isVisible, ref]
}
