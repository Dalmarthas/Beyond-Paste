import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <img
      src="/brand-logo.png"
      alt="Beyond Paste logo"
      className={cn("h-10 w-auto select-none object-contain", className)}
      draggable={false}
    />
  );
}

