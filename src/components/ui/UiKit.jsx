import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Helper for classes
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- BUTTON ---
export const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
  const variants = {
    default: "bg-[#1b4d3e] text-white hover:bg-[#153a2f]",
    ghost: "hover:bg-gray-100 text-gray-700",
    destructive: "bg-red-500 text-white hover:bg-red-600",
    outline: "border border-gray-200 bg-white hover:bg-gray-100 text-gray-900"
  };
  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    icon: "h-10 w-10",
  };
  return (
    <button
      ref={ref}
      className={cn("inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50", variants[variant], sizes[size], className)}
      {...props}
    />
  );
});

// --- INPUT ---
export const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn("flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b4d3e] disabled:cursor-not-allowed disabled:opacity-50", className)}
      ref={ref}
      {...props}
    />
  );
});

// --- CARD ---
export const Card = ({ className, children }) => <div className={cn("rounded-xl border border-gray-200 bg-white text-gray-950 shadow-sm", className)}>{children}</div>;

// --- TABS (Simplified) ---
export const Tabs = ({ value, onValueChange, children, className }) => (
  <div className={className}>{React.Children.map(children, child => React.cloneElement(child, { activeTab: value, setActiveTab: onValueChange }))}</div>
);
export const TabsList = ({ children, className }) => <div className={cn("inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500", className)}>{children}</div>;
export const TabsTrigger = ({ value, activeTab, setActiveTab, children, className }) => (
  <button
    onClick={() => setActiveTab(value)}
    className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50", activeTab === value ? "bg-white text-gray-950 shadow-sm" : "hover:bg-gray-200/50", className)}
  >
    {children}
  </button>
);
export const TabsContent = ({ value, activeTab, children, className }) => {
  if (value !== activeTab) return null;
  return <div className={cn("mt-2 ring-offset-white focus-visible:outline-none", className)}>{children}</div>;
};