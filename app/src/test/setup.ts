import "@testing-library/jest-dom";

// Tester som kör servermoduler väljer node-miljön och har ingen window.
if (typeof window === "undefined") {
  // Inget att förbereda — DOM-hjälpmedlen används inte där.
} else {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
}
