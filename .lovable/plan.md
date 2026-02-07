

## Fix: Byggfel som gör att appen inte visas

### Problem
Bygget kraschar eftersom `src/utils/healthSteps.ts` försöker importera native-plugins (`@nicepay-corp/capacitor-healthkit` och `@nicepay-corp/capacitor-health-connect`) som inte finns installerade. Dessa plugins ska bara installeras lokalt när man bygger den riktiga mobilappen.

### Lösning

**1. Uppdatera `src/utils/healthSteps.ts`**
- Ändra de dynamiska importerna så att de fångar fel korrekt och inte kraschar Vite-bygget
- Använda `try/catch` runt alla native-anrop och returnera `null`/`false` på webben
- Markera importerna som externa i Vite-konfigurationen

**2. Uppdatera `vite.config.ts`**
- Lägga till `build.rollupOptions.external` för de två native-pluginsen så Rollup inte försöker lösa dem vid byggtid

**3. Fixa CSS-varningen**
- Flytta `@import`-raden i `src/index.css` till toppen av filen (före `@tailwind`-direktiven) för att följa CSS-specifikationen

### Resultat
- Appen bygger och visas igen i webbläsaren precis som förut
- Manuell steginmatning fungerar på webben
- Native-synkning aktiveras bara när appen körs som riktig mobilapp via Capacitor
