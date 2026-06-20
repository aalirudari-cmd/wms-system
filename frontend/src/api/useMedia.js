import { useState, useEffect } from 'react';

// Reactively tracks whether a media query matches. Used to swap the desktop
// dashboard for the handheld launcher menu.
export function useIsMobile(query = '(max-width: 900px)') {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
