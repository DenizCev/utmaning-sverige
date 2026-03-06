

## Plan: Radera konto med bekräftelse

### Översikt
Lägg till en "Radera konto"-sektion längst ner på profilsidan med tvåstegs-bekräftelse:
1. Klicka "Radera mitt konto" → AlertDialog frågar "Är du säker?"
2. Användaren måste skriva in sin e-postadress för att bekräfta
3. Vid korrekt e-post → konto raderas via en Edge Function (krävs för att radera från auth.users)

### Ändringar

**1. Ny Edge Function: `supabase/functions/delete-account/index.ts`**
- Tar emot autentiserad request (JWT)
- Verifierar att inskickad e-post matchar användarens e-post
- Använder service_role-klient för att radera användaren från `auth.users` (cascade tar bort profil etc.)
- CORS-headers

**2. `supabase/config.toml`**
- Lägg till `[functions.delete-account]` med `verify_jwt = false` (validerar JWT manuellt i koden)

**3. `src/pages/ProfilePage.tsx`**
- Lägg till en röd "Radera mitt konto"-knapp längst ner
- AlertDialog med:
  - Varningstext: "Är du säker på att du vill radera ditt konto? Detta kan inte ångras."
  - Input-fält: "Skriv in din e-postadress för att bekräfta"
  - Knappen "Radera permanent" är disabled tills e-posten matchar
- Vid bekräftelse: anropa edge function → sign out → navigera till /auth

