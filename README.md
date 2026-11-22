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
| `npm run build` | Typetjek og produktionsbuild til `dist/` |

## Deploy

Push til `main` bygger og deployer til GitHub Pages via `.github/workflows/deploy.yml`. Workflowet sætter `VITE_BASE` til `/<repo-navn>/`. Under repoets Settings → Pages skal kilden være "GitHub Actions".
