"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** A QR code for a link, drawn in the browser. Renders nothing for an empty value. */
export function QrCode({ value, size = 240, label }: { value: string; size?: number; label: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!value) {
      setSrc(null);
      return;
    }
    QRCode.toDataURL(value, { width: size * 2, margin: 1, errorCorrectionLevel: "M", color: { dark: "#1f2a24", light: "#ffffff" } })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(null));
    return () => {
      alive = false;
    };
  }, [value, size]);
  if (!value) return null;
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- a generated data URL, not an optimizable asset
    <img src={src} alt={label} width={size} height={size} className="rounded-md bg-white" />
  ) : (
    <div style={{ width: size, height: size }} className="animate-pulse rounded-md bg-[var(--color-bg-muted)]" aria-label={label} />
  );
}
