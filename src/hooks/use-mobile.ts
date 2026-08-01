import * as React from "react"

// Covers phones and the full tablet range (including landscape — e.g.
// iPad Pro 12.9" is 1366px wide) so tablets get the same off-canvas
// drawer sidebar as phones. Only genuine desktop/laptop widths get the
// permanently-open sidebar.
const MOBILE_BREAKPOINT = 1280

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    () => typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT
  )

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
