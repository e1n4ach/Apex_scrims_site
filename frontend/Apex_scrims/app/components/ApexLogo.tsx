// app/components/ApexLogo.tsx
import React, { type CSSProperties } from "react";

interface ApexLogoProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function ApexLogo({ size = 120, className = "", style = {} }: ApexLogoProps) {
  return (
    <div 
      className={`apex-logo ${className}`}
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
    >
      <img
        src="/Logo white-rgb.png"
        alt="Apex Scrims Logo"
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          filter: 'drop-shadow(0 0 20px rgba(0, 150, 200, 0.3))'
        }}
      />
    </div>
  );
}
