import { useEffect, useState } from 'react'

export default function useIsMobile(breakpoint = 640) {
  const query = `(max-width: ${breakpoint - 1}px)`
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = (e) => setMatches(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])

  return matches
}