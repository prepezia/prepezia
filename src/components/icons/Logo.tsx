import React from 'react';
import Image from 'next/image';

export const Logo = ({ className }: { className?: string }) => (
  <div className={`relative ${className}`}>
    <Image
      src="https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Fsimple-avatar.png?alt=media&token=d3bc9b90-d925-42ed-9349-eee7132fd028"
      alt="Learn with Temi Logo"
      fill
      className="object-contain"
    />
  </div>
);
