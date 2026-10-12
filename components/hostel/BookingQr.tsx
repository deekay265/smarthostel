"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function BookingQr({ value }: { value: string }) {
  const [image, setImage] = useState("");
  useEffect(() => {
    let active = true;
    import("qrcode").then(({ default: QRCode }) => QRCode.toDataURL(value, {
      width: 220, margin: 2, errorCorrectionLevel: "M",
    })).then((result) => { if (active) setImage(result); });
    return () => { active = false; };
  }, [value]);
  return image
    ? <Image src={image} alt="Room allocation check-in QR code" width={176} height={176} unoptimized />
    : <span className="muted">Preparing ticket QR…</span>;
}