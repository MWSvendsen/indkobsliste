# Indkøbsliste

Webapp til iPhone, der erstatter indkøbslisten i Noter. Se `docs/byggeplan.md` og `docs/datamodel.md`.

## Kom i gang

```
npm install
npm run dev
```

| Kommando | Hvad den gør |
|---|---|
| `npm run dev` | Udviklingsserver |
| `npm test` | Vitest |
| `npm run lint` | ESLint |
| `npm run build` | Typetjek og produktionsbuild til `dist/` med service worker |
| `npm run preview` | Kør produktionsbuildet lokalt, fx for at teste offline |
| `npm run icons` | Lav ikonerne i `public/` igen ud fra `public/icon.svg` |

## Offline og data

Appen er en PWA: alt ligger i service workerens precache, så den virker uden netværk efter første besøg. En ny version hentes i baggrunden og tages i brug ved næste opstart.

Data ligger kun i telefonens IndexedDB. Under Varer → Backup kan de eksporteres og importeres som JSON. Indtil der er sync, er det den eneste backup.

## Deploy

Push til `main` bygger og deployer til GitHub Pages via `.github/workflows/deploy.yml`. Workflowet sætter `VITE_BASE` til `/<repo-navn>/`. Under repoets Settings → Pages skal kilden være "GitHub Actions".
