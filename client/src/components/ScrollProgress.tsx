'use client';

import { useEffect, useState } from 'react';

/**
 * Minimal scroll progress indicator
 * Shows a thin line at the top of the viewport indicating scroll position
 * Premium, non-distracting design similar to Apple/Linear
 */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Use passive listener for optimal scroll performance
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / docHeight) * 100;
      // Clamp between 0 and 100
      setProgress(Math.min(100, Math.max(0, scrollPercent)));
    };

    // Initial call
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hide when at or near top (< 2% scrolled)
  if (progress < 2) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[2px] bg-primary z-[9999] origin-left transition-transform duration-75 ease-out will-change-transform"
      style={{ transform: `scaleX(${progress / 100})` }}
      aria-hidden="true"
    />
  );
}
