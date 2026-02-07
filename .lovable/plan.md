

## Automatisk stegräkning med Native App (Capacitor)

### Sammanfattning
Vi sätter upp appen som en riktig mobilapp med Capacitor, som ger tillgång till telefonens inbyggda stegräknare (Apple HealthKit på iPhone, Google Health Connect på Android). Stegen synkas automatiskt till databasen.

### Vad som ändras

**1. Installera Capacitor i projektet**
- Lägga till Capacitor-beroenden (`@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`)
- Initiera Capacitor med rätt projektinställningar
- Konfigurera för hot-reload mot sandbox-URL:en

**2. Ny Edge Function: `sync-steps`**
- Tar emot stegdata från appen och sparar till `step_entries`-tabellen
- Hanterar upsert (uppdaterar om det redan finns en rad för dagens datum)

**3. Hälsodata-plugin**
- Installera `@nicepay-corp/capacitor-health-connect` (Android) och/eller `@nicepay-corp/capacitor-healthkit` (iOS)
- Alternativt ett community-plugin som stödjer båda plattformarna
- Läsa stegdata från telefonens hälsoapp

**4. Uppdatera steg-sidan (`StepsPage.tsx`)**
- Lägga till en "Synka steg"-knapp som hämtar data från HealthKit/Health Connect
- Automatisk synkning i bakgrunden när appen öppnas
- Behålla manuell inmatning som fallback (för webbläsaren)
- Visa om stegen synkades automatiskt eller matades in manuellt

**5. Uppdatera steghook (`useSteps.tsx`)**
- Ny funktion `syncFromHealth()` som läser från native API och sparar till databasen
- Detektera om appen körs i Capacitor (native) eller webbläsare

### Viktigt att veta
- Du behöver exportera projektet till GitHub och bygga lokalt
- **iPhone**: Kräver en Mac med Xcode
- **Android**: Kräver Android Studio
- Användaren måste ge appen tillgång till hälsodata (permission-prompt)
- Stegen hämtas från telefonens inbyggda stegräknare (Apple Health / Google Fit) -- ingen egen "accelerometer-räkning"

### Tekniska detaljer

**Capacitor-konfiguration:**
- `appId`: `app.lovable.67dde9c0c7f04dc4b681252975a15a19`
- `appName`: `Sweden Challenge Race`
- `server.url`: sandbox preview-URL med hot-reload

**Ny fil: `src/utils/healthSteps.ts`**
- Abstraktion som väljer rätt plugin beroende på plattform (iOS/Android/webb)
- Exporterar `getStepsForDate(date)` och `requestPermissions()`

**Plattformsdetektering:**
- Använder `@capacitor/core` `Capacitor.isNativePlatform()` för att avgöra om native-funktioner finns tillgängliga
- I webbläsaren visas manuell inmatning som idag

