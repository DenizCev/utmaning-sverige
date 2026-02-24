

# Fix: HealthKit entitlement saknas -- appen kan aldrig komma at Apple Halsa

## Problemet

Appen visar "Halsoappen ar inte tillganglig" for att iOS-projektet saknar en **entitlements-fil med HealthKit-capability**. Utan den returnerar pluginet `isHealthAvailable() = false` oavsett om Apple Halsa finns pa telefonen.

Detta ar **samma problem** i bade TestFlight och App Store -- det handlar inte om testmiljon utan om att builden saknar rattigheten.

Det behovs tva saker:
1. En `.entitlements`-fil med HealthKit aktiverad
2. Battre felhantering i koden sa att `isHealthAvailable()` inte blockerar allt om nagt gar fel

## Andringar

### 1. Skapa HealthKit entitlements-fil
**Ny fil:** `ios/App/App/App.entitlements`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.healthkit</key>
    <true/>
    <key>com.apple.developer.healthkit.access</key>
    <array>
        <string>health-records</string>
    </array>
</dict>
</plist>
```

### 2. Forbattra felhantering i `useSteps.tsx`
**Fil:** `src/hooks/useSteps.tsx`

- Om `isHealthAvailable()` returnerar `false` pa iOS, satt inte `permissionStatus` till `'unavailable'` direkt -- forsok istallet begara permission anda, eftersom pluginet ibland returnerar falskt negativt pa iOS nar entitlement ar ny
- Lagg till console.log for att gora det lattare att felsoka

### 3. Forbattra toast-meddelande i StepsPage
**Fil:** `src/pages/StepsPage.tsx`

- Andra toast-meddelandet fran "Halsoappen ar inte tillganglig" till ett mer hjalpande meddelande som forklarar att anvandaren kan behova ge tillgang manuellt i Installningar > Halsa > Kampen
- Ta bort blockeringen `disabled={... permissionStatus === 'unavailable'}` fran synk-knappen sa att anvandaren alltid kan forsoka

## Viktigt: Manuellt steg i Xcode

Entitlements-filen maste kopplas till iOS-targeten i Xcode. Efter `git pull` och `npx cap sync`:

```text
1. Oppna ios/App/App.xcodeproj i Xcode
2. Valj "App" target
3. Ga till "Signing & Capabilities"
4. Klicka "+ Capability" och lagg till "HealthKit"
5. Xcode kopplar automatiskt entitlements-filen
6. Bygg ny archive och ladda upp
```

Alternativt kan du hoppa over att lagga till filen manuellt -- om du bara gar till Signing & Capabilities i Xcode och lagger till HealthKit sa skapar Xcode filen at dig automatiskt.

## Sammanfattning

| Andring | Syfte |
|---------|-------|
| Ny `App.entitlements` fil | Ger appen HealthKit-rattighet pa iOS |
| Battre felhantering i `useSteps.tsx` | Forsok synka aven om `isHealthAvailable` returnerar false pa iOS |
| Uppdaterad UI i `StepsPage.tsx` | Battre vag ledning, ingen blockerad knapp |

