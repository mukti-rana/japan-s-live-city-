import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Joins class names and resolves Tailwind conflicts (the last one wins). Used by
// the SmoothUI components.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
