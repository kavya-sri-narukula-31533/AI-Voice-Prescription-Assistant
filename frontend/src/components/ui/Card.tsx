import React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
}

const paddings = { none: "", sm: "p-4", md: "p-5", lg: "p-6" };

export function Card({ className, padding = "md", children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm",
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-base font-semibold text-gray-900 dark:text-white", className)} {...props}>
      {children}
    </h3>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: "blue" | "green" | "amber" | "purple" | "red";
}

const colorMap = {
  blue:   { bg: "bg-blue-50 dark:bg-blue-900/20",   icon: "text-blue-600",   ring: "ring-blue-100" },
  green:  { bg: "bg-green-50 dark:bg-green-900/20", icon: "text-green-600",  ring: "ring-green-100" },
  amber:  { bg: "bg-amber-50 dark:bg-amber-900/20", icon: "text-amber-600",  ring: "ring-amber-100" },
  purple: { bg: "bg-purple-50 dark:bg-purple-900/20",icon: "text-purple-600",ring: "ring-purple-100" },
  red:    { bg: "bg-red-50 dark:bg-red-900/20",     icon: "text-red-600",    ring: "ring-red-100" },
};

export function StatCard({ title, value, icon, trend, color = "blue" }: StatCardProps) {
  const c = colorMap[color];
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {trend && (
            <p className={cn("text-xs mt-1", trend.value >= 0 ? "text-green-600" : "text-red-500")}>
              {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl ring-1", c.bg, c.ring, c.icon)}>{icon}</div>
      </div>
    </Card>
  );
}
