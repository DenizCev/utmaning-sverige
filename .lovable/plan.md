
Mål
- Ta bort beroendet av manuell Xcode-archivering helt, så att stegsynk fungerar via en CI-byggd native iOS-app.
- Säkerställa att HealthKit-entitlement faktiskt finns i den signerade TestFlight-builden (inte bara i källkod).
- Göra felsökning i appen tydlig så att vi snabbt ser om felet är behörighet, entitlement, datumintervall eller inloggning.

Vad jag hittade i nuvarande implementation
1) iOS-projektet har `CODE_SIGN_ENTITLEMENTS = App/App.entitlements` i Debug/Release (bra).
2) Entitlements-filen innehåller:
   - `com.apple.developer.healthkit = true` (rätt)
   - `com.apple.developer.healthkit.access = health-records` (onödigt för stegräkning och kan skapa signerings-/profilfriktion).
3) Fastlane-lanen tvingar manuell signing:
   - `use_automatic_signing: false`
   - explicit provisioning profile
   Detta går emot målet “automatic code signing” och ökar risken att fel profil används.
4) CI-flödet verifierar inte att det signerade arkivet verkligen innehåller HealthKit-entitlement.
5) Frontend visar idag ett generiskt fel vid synk och fångar inte exakt felorsak från native-anrop.

Genomförandeplan (i ordning)
Fas 1: Stabilisera iOS-signering för CI (ingen manuell Xcode krävs)
- Justera Fastlane till automatic signing för App-target.
- Ta bort/neutralisera hård koppling till manuell provisioning profile i lane-konfiguration.
- Behålla App Store Connect API-nyckel-flöde för upload.

Fas 2: Rensa entitlements till minsta nödvändiga för steg
- Behåll endast HealthKit-basentitlement för steg.
- Ta bort “health-records”-åtkomst från entitlements för att minska mismatch-risk mellan app-id/profil och binär.

Fas 3: Lägg in “fail-fast” verifiering i CI före upload
- Efter archive: extrahera signerade entitlements från appen i `.xcarchive`.
- Kontrollera explicit att `com.apple.developer.healthkit == true`.
- Om kontrollen misslyckas: avbryt pipeline innan upload.
- Ladda upp build-artifacts/loggar så vi kan verifiera exakt vad som signerades.

Fas 4: Förbättra felsökning i stegsynk i appen
- Returnera/fånga mer specifika fel i `useSteps`/`healthSteps`:
  - ej inloggad
  - Health API unavailable
  - permission nekad
  - query-fel från native
  - server-/svarsfel vid lagring
- Visa tydligare svensk feltext i UI (t.ex. “HealthKit saknas i denna build” vs “Ingen stegdata hittades idag”).
- Lägg en diskret debugpanel (endast i native/debug-läge) med:
  - plattform
  - permissionStatus
  - isHealthAvailable-resultat
  - senaste sync-felmeddelande
  - datumintervall som skickades till query.

Fas 5: Verifiering end-to-end (kritisk)
- Kör CI-workflow och installera ny Internal TestFlight-build.
- Verifiera i appen:
  1) Permission-dialog visas korrekt
  2) “Synka steg” ger data
  3) Steg sparas i backend
  4) Historik/leaderboard uppdateras
- Verifiera även edge case:
  - användare utan steg idag
  - nekad behörighet
  - utloggad användare.

Teknisk detaljerad ändringslista
- `.github/workflows/ios-testflight.yml`
  - förenkla signing-flöde till automatic signing-kompatibelt upplägg
  - lägg till entitlement-verifieringssteg efter archive
  - spara relevanta artifacts/loggar
- `ios/App/fastlane/Fastfile`
  - ändra signing-strategi till automatic
  - ta bort hård profilmappning som kan låsa fel capability-set
  - behåll upload till TestFlight
- `ios/App/App/App.entitlements`
  - minimera till HealthKit för stegscenariot
- `src/utils/healthSteps.ts` och `src/hooks/useSteps.tsx`
  - rikare felhantering/diagnostik
- `src/pages/StepsPage.tsx`
  - tydligare svenska status- och felmeddelanden + diagnostiksektion

Risker och hantering
- Risk: Apple-kontot/app-id saknar aktiverad HealthKit-capability.
  - Hantering: CI fail-fast med tydligt fel vid signering/entitlement-kontroll.
- Risk: appen får “permission granted” men ingen data hittas för valt datum.
  - Hantering: tydlig UI-återkoppling “ingen stegdata hittad” + visning av datumintervall.
- Risk: fortfarande fel build testas lokalt.
  - Hantering: verifiera buildnummer i appens “Om”-sektion/toast och i TestFlight.

Resultat efter implementation
- Du behöver inte köra Product → Archive manuellt i Xcode.
- Pipeline producerar en korrekt signerad iOS-build med verifierad HealthKit-entitlement.
- Stegsynkfel blir konkreta och felsökningsbara istället för generiska.
