import { useState, useEffect } from 'react';

/** Breakpoints: mobile < 640px, tablet 640–1024px, desktop >= 1024px */
const BP = { mobile: 640, desktop: 1024 };

export function useBreakpoint() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return {
    width,
    isMobile: width < BP.mobile,
    isTablet: width >= BP.mobile && width < BP.desktop,
    isDesktop: width >= BP.desktop,
  };
}
