import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
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
        src: 'https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Ffavicon.png?alt=media&token=2eba5a56-46dc-44db-9d8c-a91cff1f4f2c',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: 'https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Ffavicon.png?alt=media&token=2eba5a56-46dc-44db-9d8c-a91cff1f4f2c',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Ffavicon.png?alt=media&token=2eba5a56-46dc-44db-9d8c-a91cff1f4f2c',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: 'https://firebasestorage.googleapis.com/v0/b/studio-4412321193-4bb31.firebasestorage.app/o/public%2Ffavicon.png?alt=media&token=2eba5a56-46dc-44db-9d8c-a91cff1f4f2c',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
