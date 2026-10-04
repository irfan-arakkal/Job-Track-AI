import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names and resolves Tailwind conflicts, so a component's default classes can be
 * overridden by the caller: cn("px-4", "px-2") → "px-2".
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
