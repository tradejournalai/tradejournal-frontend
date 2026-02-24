// src/utils/metaPixel.ts

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export const trackEvent = (
  eventName: string,
  params?: Record<string, unknown>,
  eventId?: string
) => {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    if (eventId) {
      window.fbq("track", eventName, params ?? {}, {
        eventID: eventId,
      });
    } else {
      window.fbq("track", eventName, params ?? {});
    }
  }
};

export const trackPageView = (eventId?: string) => {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    if (eventId) {
      window.fbq("track", "PageView", {}, { eventID: eventId });
    } else {
      window.fbq("track", "PageView");
    }
  }
};