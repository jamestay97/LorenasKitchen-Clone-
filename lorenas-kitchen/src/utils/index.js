import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const createPageUrl = (pageName) => {
  // Maps your old page names to standard URLs
  const routes = {
    'Home': '/',
    'Admin': '/admin',
    'AdminLogin': '/login',
    'Gallery': '/gallery'
  };
  return routes[pageName] || '/';
};