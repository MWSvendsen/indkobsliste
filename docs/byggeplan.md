# Byggeplan: Indkøbsliste v1

Status: klar til Claude Code · 22. november 2026

## Formål

En webapp til iPhone, der erstatter indkøbslisten i Noter. Den skal gøre tre ting godt:

1. Gøre det hurtigt at sætte det på listen, man er løbet tør for.
2. Vise listen i den rækkefølge, man går rundt i Netto, og lade én krydse af undervejs.
3. Lade madplanen lægge de ingredienser på listen, man aktivt vælger.

Version 1 kører på én telefon uden synkronisering, men datamodellen er klar til, at to personer kan dele den senere.

## Kilder

Filerne ligger i samme mappe som denne plan.

| Kilde | Rolle |
|---|---|
| `datamodel.md` | **Bindende.** Entiteter, felter, relationer og regler. |
| `prototype-main.dc.html` | **Reference for UI.** Layout, farver, tekster, flows og eksempeldata. Det er skrevet i et særligt prototypeformat (Design Component) og skal oversættes til React. Koden må ikke kopieres direkte. Domænelogikken i `renderVals()` viser de forventede regler. |
| Designcanvas: https://claude.ai/artifact/6ycJ2wc4Qa234mzFvyz4ZD | Klikbar prototype med syv skærme. Kan kun åbnes af ejeren. |

## Tekniske beslutninger

| Emne | Beslutning | Begrundelse og konsekvens |
|---|---|---|
| Stack | Vite + React + TypeScript (strict) | Ligger tæt på prototypens komponentlogik. Typer på datamodellen. |
| Lagring | IndexedDB via Dexie, med `useLiveQuery` til at læse data | Samme struktur som den senere server, jf. datamodellen. Dexie er en udbredt wrapper og gør det let at skifte til sync senere. |
| Offline | PWA med `vite-plugin-pwa`: manifest, service worker og precache | Der er ofte dårlig dækning i butikken, så appen skal virke helt offline. |
| Hosting | GitHub Pages, deployet med GitHub Actions ved push til `main` | Gratis og statisk. Husk at sætte `base` i Vite til repoets sti. |
| Navigation | Faner styret af state, ingen router. Brug hash-routing, hvis der bliver brug for dybe links. | GitHub Pages har ingen SPA-fallback. |
| Styling | CSS Modules eller ren CSS med custom properties til design tokens | Få afhængigheder. Tailwind er også i orden, hvis Code foretrækker det, men tokens skal følge afsnittet nedenfor. |
| Tests | Vitest til domæneregler | Reglerne om antal, sammenlægning og afslut indkøb skal være dækket af tests. |
| Sprog | Al UI-tekst på dansk, som i prototypen | |

## Funktioner i v1

### Liste (handle i butikken)
- Linjer grupperet efter område i rutens rækkefølge og sorteret alfabetisk inden for området. Hvert område har sin farveprik.
- Tryk på en linje lægger den i kurven, og tryk igen tager den op. Antal over 1 vises som "2 ×".
- Mørkt topfelt med "x / y" og en statuslinje.
- "I kurven" står nederst. "Afslut indkøb" sletter de afkrydsede linjer og opdaterer `purchaseCount` og `lastPurchasedAt`.
- En svævende knap "Tilføj" åbner Tilføj vare.

### Tilføj vare
- Søgefeltet er i fokus, når skærmen åbner. Resultater med ord, der starter med søgningen, står først og sorteres efter `purchaseCount`.
- Står varen ikke på listen, tilføjer et tryk 1. Står den der, vises plus og minus.
- Enter tilføjer det øverste resultat.
- Findes varen ikke, vises "Ny vare" med valg af område. Ét tryk opretter varen og sætter den på listen.
- Uden søgning vises "Det køber I tit", som er de 10 varer med højest `purchaseCount`, der ikke allerede står på listen.

### Varer (katalog)
- Alle varer vises som knapper, grupperet efter område. Er varen ikke på listen, tilføjer et tryk 1. Er den på listen, bliver knappen til en limegrøn pille med minus, antal og plus. Når antallet kommer under 1, fjernes varen fra listen.
- "Ret rute" viser områderne med pil op og pil ned og opdaterer `Zone.position`.

### Retter
- Liste over retter med deres ingredienser og hvilke dage, de står på madplanen.
- "Ny ret" og "Rediger" åbner editoren. I editoren angiver man navn, ingredienser med antal og søger ingredienser i kataloget. Findes en vare ikke, kan den oprettes med et område. Man kan også slette en ret.
- "Sæt på madplanen" åbner et valg af dag og derefter Vælg ingredienser.

### Madplan
- Ugen går fra mandag til søndag med én ret pr. dag. Den viser denne uge og kan bladres frem.
- En tom dag har knappen "Tilføj ret", der åbner valget af ret. Her kan man også vælge "Ny ret", og når den nye ret er gemt, sættes den på dagen.
- For en dag med en ret vises ingredienserne og status: "Vælg ingredienser" eller "Ingredienser er valgt" med knappen "Vælg igen".
- **Vælg ingredienser**: intet er valgt fra start, og knappen "Vælg alle" findes. Står en vare allerede på listen, vises "1 står allerede på listen". Når man bekræfter, lægges rettens antal til listen, og `ingredientsAddedAt` sættes.

### Første opstart
- Databasen fyldes med eksempeldata fra prototypens `seed()`: 10 områder, cirka 45 varer og 7 retter. Listen og madplanen starter tomme.
- Under Varer er der "Nulstil til eksempeldata", og man skal bekræfte, før det sker.

### Datasikkerhed (anbefalet)
- Kald `navigator.storage.persist()` ved første opstart.
- Under Varer er der "Eksportér data" og "Importér data" i JSON. Safari kan slette lokale data under nogle forhold, og indtil sync findes, er det den eneste backup.

## Design tokens

| Token | Værdi |
|---|---|
| Baggrund | `#F2F2ED` |
| Kort | `#FFFFFF`, radius 20, skygge `0 1px 2px rgba(22,32,27,.05), 0 6px 20px rgba(22,32,27,.05)` |
| Ink (tekst, mørke flader) | `#16201B` |
| Dæmpet tekst | `#5D6259` |
| Accent | `#C6F36B` (limegrøn) med `#16201B` som tekst ovenpå |
| Grøn statustekst | `#17533A` / `#2C6A3F` |
| Skillelinjer | `#ECEAE3`, kanter på knapper `#DEDDD5` |
| Overskrifter | Bricolage Grotesque 700, 40 px, letter-spacing -0.035em |
| Brødtekst | Inter 400–700, 15–17 px |
| Navigation | Mørk pille (`#16201B`), der svæver 14 px fra siderne og 18 px over bunden. Den aktive fane har accentfarvet baggrund. |
| Bundark | radius 28 foroven, baggrund `#F2F2ED`, baggrundslag `rgba(20,22,18,.42)` |
| Farveprik pr. område | frugt `#6DBE45`, brød `#E0A43A`, mejeri `#7FB3E8`, pålæg `#E58A8A`, øvrige kølevarer `#5FC3B5`, kød `#D2604F`, kolonial `#C9A66B`, frost `#8FA8F0`, drikke `#4FA3D1`, husholdning `#A889D8` |

Hent skrifterne lokalt, så de også virker offline, fx med `@fontsource`. Ikonerne er enkle stroke-ikoner. Brug fx Lucide i stedet for at tegne dem igen.

## Kvalitetskrav

- Alle trykflader er mindst 44 × 44 px. Brug rigtige `<button>`- og `<input>`-elementer med labels og `aria-label` på knapper, der kun har et ikon.
- Kontrast på mindst 4.5:1 for tekst.
- Respektér `env(safe-area-inset-*)` på iPhone, især for den svævende menu og bundarkene.
- Inputfelter skal have mindst 16 px skrift, så iOS ikke zoomer ind.
- Manifest med `display: standalone`, `apple-touch-icon` og en temafarve.
- Ingen netværkskald i v1 ud over at hente appen selv.

## Uden for v1

- Synkronisering mellem telefoner og login.
- Enheder (gram, liter), antal personer på retter, mere end én ret pr. dag og fritekst på varer. Det er fravalgt i datamodellen.
- Flere butikker.
- At huske hvilken ret en linje på listen kom fra.

## Arbejdsgang for Claude Code

Spørg brugeren, før du opretter repoet, før du pusher første gang, og før du slår GitHub Pages til. Lav i øvrigt én milepæl ad gangen, og vis resultatet, før du går videre. Læg de tre kildefiler i en mappe `docs/` i repoet, så de følger med koden.

1. **Skelet**: Vite + React + TS, lint og Vitest. Deploy af en tom side til GitHub Pages med Actions.
2. **Data**: Dexie-skema efter datamodellen med UUID, `createdAt`, `updatedAt` og `deletedAt`, eksempeldata og et domænelag med reglerne fra datamodellen og tests.
3. **Liste og Tilføj vare.**
4. **Varer og rute.**
5. **Retter og editor.**
6. **Madplan og Vælg ingredienser.**
7. **PWA og afslutning**: offline, ikoner, eksport og import af data og et tjek på en rigtig iPhone, der er lagt på hjemmeskærmen.

Hver milepæl er færdig, når den er deployet, når testene er grønne, og når flowet virker på mobilbredde (390 px).
