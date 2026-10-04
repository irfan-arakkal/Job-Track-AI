"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/** Toast notifications. Call `toast.success("...")` from `sonner` anywhere on the client. */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="system"
      richColors
      closeButton
      position="top-right"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
