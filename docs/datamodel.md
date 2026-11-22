# Indkøbsliste: datamodel v1

Status: godkendt til prototype 2 · 22. november 2026

## Kontekst

Appen er en webapp til iPhone. Version 1 kører på én telefon uden synkronisering, men den skal på sigt deles mellem to personer i samme husstand. Prototypen viser fire behov:

1. Et fast varekatalog, så man slår varer til og fra i stedet for at slette og skrive dem igen.
2. En indkøbsliste med antal, sorteret efter ruten i den lokale Netto.
3. Et retkatalog, hvor hver ret har faste ingredienser med antal.
4. En madplan for ugen. Når en ret lægges på en dag, vælger man aktivt de ingredienser, der skal købes, og kun dem kommer på listen.

## Beslutning

Modellen er normaliseret og klar til synkronisering fra start, selvom version 1 kun gemmer lokalt.

### Entiteter

| Entitet | Felter | Bemærkning |
|---|---|---|
| **Household** | id, name | Ejer alle data. Én i v1, men findes fra start, så sync ikke kræver migrering. |
| **Zone** (område) | id, householdId, name, position | Et område i butikken, fx Frugt & grønt. `position` er rutens rækkefølge. |
| **Item** (vare) | id, householdId, name, zoneId, purchaseCount, lastPurchasedAt | Varekataloget. `purchaseCount` styrer forslag under "Det køber I tit". |
| **ListEntry** (linje på listen) | id, householdId, itemId, quantity, checked, checkedAt, addedBy | Højst én aktiv linje pr. vare. Tilføjes varen igen, lægges antallet til. |
| **Recipe** (ret) | id, householdId, name | Retkataloget. |
| **RecipeIngredient** | id, recipeId, itemId, quantity | Ingrediens i en ret med standardantal. Peger på en vare i kataloget. |
| **MealPlanEntry** (ret på en dag) | id, householdId, date, recipeId, ingredientsAddedAt | Én ret pr. dag. `ingredientsAddedAt` viser, om ingredienserne er valgt. |

Alle entiteter har desuden `createdAt`, `updatedAt` og `deletedAt`.

### Relationer

- Zone 1:n Item
- Item 1:0..1 ListEntry (aktiv linje)
- Recipe 1:n RecipeIngredient n:1 Item
- MealPlanEntry n:1 Recipe

### Regler

- **Antal** er et heltal på mindst 1. Når antallet kommer under 1, fjernes linjen.
- **Tilføj til listen**: findes der en linje for varen, lægges antallet til, og ellers oprettes en ny. Lå linjen i kurven, bliver den sat tilbage som ikke afkrydset.
- **Afslut indkøb**: afkrydsede linjer slettes, og `purchaseCount` og `lastPurchasedAt` opdateres på varen.
- **Vælg ingredienser**: brugeren vælger aktivt hver ingrediens. Intet er valgt på forhånd, men "Vælg alle" findes som genvej. De valgte lægges på listen med rettens antal.
- **Ny vare** kan oprettes både fra listen og fra en ret og skal altid have et område, så den lander rigtigt på ruten.

### Klar til sync

- id'er er UUID'er, som klienten genererer, så der kan oprettes data offline.
- `updatedAt` på alle rækker. Konflikter løses med last-write-wins pr. række.
- Soft delete med `deletedAt`, så sletninger også synkroniseres.
- Lokal lagring i v1 bør være IndexedDB med præcis samme struktur som den senere server, så den kan synkroniseres uden at bygge om.

## Konsekvenser

- **Fordel**: sync mellem to telefoner kan tilføjes uden at ændre datamodellen. Kun lagringslaget skiftes.
- **Fordel**: antal fra flere retter samles automatisk, fx 1 hakket oksekød mandag og 1 onsdag giver 2 på listen.
- **Ulempe**: listen husker ikke, hvilken ret en linje kom fra. Fjerner man en ret fra madplanen, bliver ingredienserne stående på listen. Det er et bevidst fravalg for at holde modellen enkel og kan tilføjes senere med en `ListEntrySource`.
- **Ulempe**: last-write-wins kan miste en ændring, hvis I begge retter antallet på den samme vare inden for få sekunder. Med to brugere vurderer jeg risikoen som lav, men den bør nævnes.
- **Afgrænsning**: ingen enheder (gram, liter) i v1, kun antal. Kun én butik. Skal der flere butikker på, flyttes `position` fra Zone til en ny tabel `StoreZone(storeId, zoneId, position)`.

## Afklaret 22. november 2026

- Retter har ikke et antal personer, og ingredienser skaleres ikke.
- Der er højst én ret pr. dag.
- Varer har ingen fritekst. En variant som "laktosefri mælk" oprettes som sin egen vare.
