"use client";

/**
 * Logo as img so SVG loads reliably (Next/Image can break SVG on some hosts).
 */
type Props = {
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
};

export function Logo({ alt = "Paza", className, width = 120, height = 40 }: Props) {
  return (
    <img
      src="/logo.svg"
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  );
}
