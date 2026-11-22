import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Laver favicon, PWA-ikoner og apple-touch-icon ud fra public/icon.svg.
// Kør `npm run icons`, når ikonet ændres. Filerne ligger i public/ og er committet.
// SVG'en har selv sin sikre zone, så der lægges ikke ekstra luft på.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background: '#16201B' } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: '#16201B' } },
  },
  images: ['public/icon.svg'],
});
