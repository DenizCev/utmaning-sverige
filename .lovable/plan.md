

## Plan: Fixa kamera-permission för App Store-godkännande

### Problem
`NSCameraUsageDescription` i Info.plist säger "Appen använder kameran..." medan mikrofon och fotobibliotek konsekvent använder "Kampen". Apple kan neka om beskrivningen inte är tillräckligt tydlig eller inkonsekvent.

### Ändringar

**Fil: `ios/App/App/Info.plist`**

Uppdatera `NSCameraUsageDescription` så att den:
1. Använder appnamnet "Kampen" (som de andra behörighetstexterna)
2. Förklarar tydligare varför kameran behövs och vad som händer med bilden

Ny text:
```
NSCameraUsageDescription:
"Kampen behöver åtkomst till kameran så att du kan ta ett foto eller spela in en video som bevis på att du har slutfört en utmaning. Materialet laddas upp till våra servrar och granskas av administratörer för att verifiera ditt resultat."
```

De övriga texterna (mikrofon, fotobibliotek, hälsa) är redan korrekta och behöver inte ändras.

### Viktigt
- Info.plist används i **både Debug och Release** (bekräftat i project.pbxproj rad 301 och 324)
- Inga andra Info.plist-filer skriver över denna
- Efter ändringen måste du köra `npx cap sync ios` och göra en clean build i Xcode innan ny submission

