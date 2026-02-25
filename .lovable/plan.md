
Målbild
- Göra stegsynk stabil i CI-byggd iOS-app (TestFlight/App Store) utan krav på manuell Xcode-archive.
- Rensa bort onödig komplexitet så flödet blir: push kod → workflow bygger/signerar → stegsynk fungerar.

Vad som faktiskt ser ut att vara huvudfelet just nu
1) Kritisk kodbugg i stegsynk:
- I `src/utils/healthSteps.ts` skickas `bucket: '1day'` till `Health.queryAggregated(...)`.
- Pluginet (`capacitor-health`) accepterar `bucket: "day"` (inte `"1day"`), både i iOS- och Android-implementationen.
- Detta kan ge query-fel även om entitlement/signering är korrekt, vilket matchar symptom “native build finns men synk funkar inte”.

2) CI-flödet är nära rätt men inte helt “fail-fast”:
- Workflow verifierar HealthKit-entitlement efter att fastlane-lanen redan har uploadat.
- Det bör verifieras innan upload, så fel build aldrig skickas upp.

3) Entitlements är inte minimala:
- `ios/App/App/App.entitlements` innehåller extra nyckel `com.apple.developer.healthkit.access` (tom array).
- För step read räcker `com.apple.developer.healthkit = true`; extra nyckeln kan skapa onödig friktion.

4) Ingen backend-data/loggar för steg:
- Inga färska rader i `step_entries` och inga körningar för `sync-steps` hittades, vilket stärker att flödet faller redan innan server-anrop (dvs i health query/permission).

Genomförande (fokuserat, minimalt, utan “extra saker”)
Fas 1 — Fixa den verkliga synk-buggen
- Ändra bucket till `day` i `getStepsForDate`.
- Förbättra felretur från `getStepsForDate` så originalfel från plugin (t.ex. “Unsupported bucket”) bubblar upp till `useSteps` istället för att maskeras till `null`.
- Justera felmeddelanden i `useSteps` så de blir diagnostiska men korta på svenska.

Fas 2 — Rensa iOS capability/entitlement till minsta fungerande
- I `App.entitlements`: behåll endast HealthKit-basentitlement.
- Säkerställ att projektets capability-konfiguration är konsekvent med detta (så CI-signering får samma resultat som manuell archive hade gett).

Fas 3 — Göra CI verkligen självförsörjande (ingen manuell Xcode)
- Behåll `npm run build` + `npx cap sync ios` i workflow (detta ersätter manuellt sync/prepare).
- Flytta entitlement-verifiering till innan upload:
  - bygg archive/ipa
  - kontrollera signerad binär innehåller `com.apple.developer.healthkit`
  - endast därefter upload till TestFlight
- Behåll artifact-uppladdning för loggar så felsökning kan ske utan Xcode lokalt.

Fas 4 — Förenkla och “avbrusa”
- Ta bort/undvik överflödiga steg i workflow/lane som inte behövs för ditt mål.
- Behålla endast nödvändigt för: signering, build, entitlement-check, upload.
- Behålla debug-info i appen men endast som diskret felsökningsstöd (inte påverka normal UX).

Teknisk ändringslista (planerade filer)
- `src/utils/healthSteps.ts`
  - `bucket: '1day'` -> `bucket: 'day'`
  - tydligare felhantering från `queryAggregated`
- `src/hooks/useSteps.tsx`
  - mappa pluginfel till tydliga svenska felorsaker i syncflödet
- `ios/App/App/App.entitlements`
  - minimera till HealthKit-basnyckel
- `ios/App/fastlane/Fastfile`
  - ordna lane-sekvens så entitlement-check sker före upload
- `.github/workflows/ios-testflight.yml`
  - spegla fail-fast-sekvens och behåll `npx cap sync ios`

Vad du inte ska behöva göra manuellt efter detta
- Ingen manuell “Product → Archive” i Xcode.
- Ingen manuell native-synk inför varje release (CI gör `npx cap sync ios`).
- Du behöver bara trigga workflowet; samma pipeline ska ge fungerande TestFlight/App Store-bygge för stegsynk.

Verifieringsplan (end-to-end)
1) Kör workflow och bekräfta i logg att:
- Capacitor sync körts
- HealthKit-entitlement hittas i signerad binär
- upload sker först efter godkänd entitlement-check

2) Installera ny TestFlight-build och testa i appen:
- ge Health-behörighet
- tryck “Synka steg”
- verifiera att dagens steg visas
- verifiera att historik + leaderboard uppdateras

3) Kontroll i backend:
- ny rad/uppdatering i `step_entries`
- körningslogg för `sync-steps` finns

Risker och hur de hanteras
- Risk: entitlement finns men användaren har nekat läsbehörighet i Hälsa.
  - Hantering: tydligt felmeddelande + väg till rätt inställning.
- Risk: 0 steg idag feltolkas som fel.
  - Hantering: behandlas som giltigt utfall (inte hårt fel).
- Risk: CI laddar upp build trots capability-problem.
  - Hantering: strikt fail-fast före upload.

Resultat efter implementation
- Stegsynk blir beroende av korrekt CI-build (inte lokal Xcode-archive).
- Flödet blir enklare, mer robust och fokuserat på det du faktiskt behöver.
- Du får en repeterbar releaseprocess där TestFlight/App Store-builden har samma förutsättningar för stegsynk.
