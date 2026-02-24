

# Fix: Stegsynk och behörigheter for riktig App Store-app

## Problem

Tre saker hindrar stegräknaren fran att fungera i en nedladdad app:

1. **`capacitor.config.ts` pekar pa en webbadress** (`server.url`) -- detta gor att appen laddar webbversionen istallet for det inbyggda native-paketet. Darfor returnerar `Capacitor.isNativePlatform()` falskt och appen tror att den kors i en webblasare.

2. **iOS `Info.plist` saknar HealthKit-nycklar** -- utan `NSHealthShareUsageDescription` kan iOS aldrig visa behorighetsfragan for Apple Halsa.

3. **Vilseledande UI-texter** -- Sidan visar "Stegsynk fungerar inte i webblasaren" aven nar appen kors som native-app, vilket forvirrar anvandaren.

## Andringar

### 1. Ta bort `server.url` fran Capacitor-konfigurationen
**Fil:** `capacitor.config.ts`

Ta bort hela `server`-blocket sa att appen laddar fran sitt lokala bundle. Detta ar den kritiska fixen -- utan den identifierar sig appen som "web" och all native-funktionalitet blockeras.

### 2. Lagga till HealthKit-nycklar i Info.plist
**Fil:** `ios/App/App/Info.plist`

Lagga till:
- `NSHealthShareUsageDescription` -- "Kampen behover tillgang till Apple Halsa for att lasa dina steg och visa dem i tavlingen."
- `NSHealthUpdateUsageDescription` -- "Kampen anvander Apple Halsa for att synka stegdata."

### 3. Ta bort vilseledande webblasarvarning fran stegsidan
**Fil:** `src/pages/StepsPage.tsx`

- Ta bort hela Alert-blocket (rad 140-151) som sager "Stegsynk fungerar inte i webblasaren..."
- Ta bort texten "Oppna i native-app for stegsynk" fran knappen
- Ta bort den lilla texten under knappen om att "Steg och halsobehorighet fungerar bara i iOS/Android-appen"
- Alla anvandare (oavsett plattform) ser bara synk-knappen rakt av -- om nagon oppnar via webblasaren hanteras felet graciost i handleSyncHealth med en toast

### 4. Forbattra handleSyncHealth-logik
**Fil:** `src/pages/StepsPage.tsx`

Istallet for att blockera med en toast nar `isNative === false`, forsok alltid synka. Om det misslyckas (t.ex. i webblasare) visas ett generellt felmeddelande utan att namna Safari/PWA.

### 5. Android Health Connect-behorigheter
**Fil:** `android/app/src/main/AndroidManifest.xml`

Lagga till `android.permission.health.READ_STEPS` permission och Health Connect intent-filter for framtida Android-stod.

## Efter implementation

Du behover gora foljande lokalt:

```text
1. git pull
2. npm run build
3. npx cap sync
4. Bygg ny iOS-archive i Xcode och ladda upp till App Store / TestFlight
```

