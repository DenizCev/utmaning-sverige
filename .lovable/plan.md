

## Plan: Byt till `@capgo/capacitor-health` (Capacitor 8-kompatibelt)

### Problem
Nuvarande `capacitor-health` (v7) stödjer inte Capacitor 8, vilket orsakar SPM-versionskonflikter vid `npx cap sync ios` och bygge i CI.

### Lösning
Byt till `@capgo/capacitor-health` som explicit stödjer Capacitor 8, har SPM-distribution, och erbjuder samma funktionalitet (`queryAggregated`, HealthKit, Health Connect).

### API-skillnader att hantera
Det nya pluginet har ett annat API:

```text
Gammalt (capacitor-health)              Nytt (@capgo/capacitor-health)
─────────────────────────────────────── ──────────────────────────────────────
Health.isHealthAvailable()              Health.isAvailable()
  → { available }                         → { available, reason }

Health.requestHealthPermissions(        Health.requestAuthorization(
  { permissions: ['READ_STEPS'] })        { read: ['steps'] })

Health.checkHealthPermissions(...)      Health.checkAuthorization(
                                          { read: ['steps'] })

Health.queryAggregated(                 Health.queryAggregated(
  { dataType: 'steps',                   { dataType: 'steps',
    bucket: 'day' })                       bucket: 'day',
  → { aggregatedData: [...] }              aggregation: 'sum' })
                                          → { samples: [...] }

Health.openAppleHealthSettings()        (ej tillgänglig — iOS hanterar via
                                         systeminställningar direkt)
Health.openHealthConnectSettings()      Health.openHealthConnectSettings()
Health.showHealthConnectInPlayStore()   (ej separat — isAvailable ger reason)
```

### Filer som ändras

1. **`package.json`**
   - Ta bort `"capacitor-health": "^7.0.0"`
   - Lägg till `"@capgo/capacitor-health": "^8.0.0"`

2. **`src/utils/healthSteps.ts`** — Fullständig omskrivning av alla anrop:
   - `import { Health } from '@capgo/capacitor-health'`
   - `isHealthAvailable()` → `Health.isAvailable()`
   - `requestHealthPermissions()` → `Health.requestAuthorization({ read: ['steps'] })`
   - `checkHealthPermissions()` → `Health.checkAuthorization({ read: ['steps'] })`
   - `getStepsForDate()` → `Health.queryAggregated({ ..., aggregation: 'sum' })` med `result.samples` istället för `result.aggregatedData`
   - `openHealthSettings()` → `Health.openHealthConnectSettings()` (Android), ta bort iOS-specifik `openAppleHealthSettings`

3. **`ios/App/App/App.entitlements`** — Behåll som den är (bara `com.apple.developer.healthkit = true`)

4. **`ios/App/fastlane/Fastfile`** — Behåll `project: "App.xcodeproj"` (redan korrekt)

5. **`.github/workflows/ios-testflight.yml`** — Inga ändringar behövs (redan har `npx cap sync ios` och entitlement-verifiering)

### Vad som INTE ändras
- `useSteps.tsx` — Behöver inga ändringar, den anropar bara funktionerna i `healthSteps.ts`
- `StepsPage.tsx` — Behöver inga ändringar
- Fastfile och CI-workflow — Redan korrekt konfigurerade
- HealthKit entitlements och Info.plist — Redan korrekt

### Efter implementation
Du behöver köra lokalt:
1. `git pull`
2. `npm install` (installerar nya pluginet, tar bort gamla)
3. `npm run build`
4. `npx cap sync ios` (synkar nya SPM-paketet)
5. `git push` → trigga GitHub Actions workflow

