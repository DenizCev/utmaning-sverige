

## Plan: Ta bort plats, behåll kamera + mikrofon

### Ändringar

**1. `src/pages/ChallengePage.tsx`**
- Ändra proaktiv permission-prompt (rad 35) från `{ video: true }` till `{ video: true, audio: true }` så att både kamera och mikrofon frågas om direkt
- Ta bort hela geolocation-blocket (rad 76–84)
- Ta bort `latitude`/`longitude` från insert-anropet (rad 91–92)
- Ta bort `MapPin`-import och plats-texten i UI:t (rad 191)
- Ta bort oanvända imports (`MapPin`)

**2. `ios/App/App/Info.plist`**
- Ta bort `NSLocationWhenInUseUsageDescription` (om den finns)
- Behåll `NSCameraUsageDescription` och `NSPhotoLibraryUsageDescription` (redan korrekta)
- Behåll `NSMicrophoneUsageDescription` (redan tillagd)

**3. `android/app/src/main/AndroidManifest.xml`**
- Ta bort `ACCESS_FINE_LOCATION` och `ACCESS_COARSE_LOCATION` (om de finns)
- Behåll `CAMERA`-permission

Inga databasändringar krävs — `latitude`/`longitude`-kolumnerna kan finnas kvar (nullable), de skrivs bara inte till längre.

