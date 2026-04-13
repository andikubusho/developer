import { useState, useEffect } from "react";

/**
 * Hook kustom untuk melacak parameter tab (?tab=) secara instan.
 * Menggunakan intersepsi History API untuk memberikan respons real-time
 * tanpa delay polling (setInterval).
 */
export function useActiveTab() {
  const [activeTab, setActiveTabState] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("tab") || "home";
    }
    return "home";
  });

  useEffect(() => {
    const handleUrlChange = () => {
      const tab = new URLSearchParams(window.location.search).get("tab") || "home";
      setActiveTabState(tab);
    };

    // Override pushState and replaceState to catch internal wouter/link navigations
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      handleUrlChange();
    };

    window.history.replaceState = function(...args) {
      originalReplaceState.apply(window.history, args);
      handleUrlChange();
    };

    // Standard popstate for back/forward buttons
    window.addEventListener("popstate", handleUrlChange);
    
    // Also listen to a custom event just in case
    window.addEventListener("locationchange", handleUrlChange);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", handleUrlChange);
      window.removeEventListener("locationchange", handleUrlChange);
    };
  }, []);

  return activeTab;
}
