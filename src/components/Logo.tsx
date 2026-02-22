"use client";

import { LOGO_SVG } from "./logo-svg";

/**
 * Logo as inline SVG so it always displays (no request to /logo.svg needed).
 * Works on all hosts including Netlify where static public files may not be served at root.
 */
type Props = {
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
};

export function Logo({ alt = "Paza", className, width = 120, height = 40 }: Props) {
  const svgWithSize = LOGO_SVG.replace(
    "<svg ",
    '<svg width="100%" height="100%" style="display:block;vertical-align:middle" '
  );
  return (
    <span
      className={className}
      role="img"
      aria-label={alt}
      style={{
        display: "inline-block",
        width,
        height,
        lineHeight: 0,
      }}
      dangerouslySetInnerHTML={{ __html: svgWithSize }}
    />
  );
}
