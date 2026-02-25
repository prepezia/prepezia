import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  const logoUrl = 'https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Fprepezia%20logo%20-%20Copy.png?alt=media&token=3d0f28b4-8873-4b6f-aa46-e6a4909d6448';
  
  return {
    name: 'Prepezia',
    short_name: 'Prepezia',
    description: 'Your AI-powered learning partner for research and exam prep.',
    start_url: '/home',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#5f43b6',
    icons: [
      {
        src: logoUrl,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: logoUrl,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: logoUrl,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: logoUrl,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
