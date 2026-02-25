import { ReactNode, useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * PageTransition component provides smooth fade + slide transitions
 * when navigating between routes
 * Only triggers on pathname changes, NOT query parameter changes
 */
export default function PageTransition({ children, className }: PageTransitionProps) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState<"entering" | "entered">("entered");
  const previousPathnameRef = useRef(location.pathname);

  useEffect(() => {
    // Only trigger transition on pathname changes, not query param changes
    // This prevents blinking when filters/tabs change
    if (location.pathname !== previousPathnameRef.current) {
      previousPathnameRef.current = location.pathname;
      setTransitionStage("entering");
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage("entered");
      }, 150);
      return () => clearTimeout(timer);
    } else {
      // Pathname hasn't changed, just update displayLocation silently
      // This handles query param changes without animation
      setDisplayLocation(location);
    }
  }, [location]);

  return (
    <div
      className={cn(
        "min-h-full",
        transitionStage === "entering" && "page-exit",
        transitionStage === "entered" && "page-enter",
        className
      )}
      style={{
        animationDuration: "250ms",
      }}
    >
      {children}
    </div>
  );
}

