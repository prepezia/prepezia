import Image from 'next/image';
import React from 'react';

export const Logo = ({ className }: { className?: string }) => {
    return (
        <div className={`relative ${className || 'w-8 h-8'}`}>
            <Image
                src="https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Fprepezia%20logo%20-%202).png?alt=media&token=0fb17391-9e36-409f-a1da-16c2d266d74c"
                alt="Prepezia Logo"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 10vw, 5vw"
            />
        </div>
    );
};
