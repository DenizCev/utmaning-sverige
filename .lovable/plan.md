

# Skicka autentiseringsmail via Resend API

## Bakgrund
Lovable Cloud-backenden exponerar inte SMTP-inställningar i sitt gränssnitt. Istället bygger vi en lösning med edge functions som skickar e-post direkt via Resend API.

## Översikt
Alla mail som appen skickar (verifiering vid registrering, glömt lösenord) skickas via en egen backend-funktion som använder Resend, med avsändaradressen `sverigekampen@kampen.app` och avsändarnamnet "Kampen Sverige".

## Steg

### 1. Spara Resend API-nyckel som hemlighet
- Lagra din Resend API-nyckel säkert som en backend-hemlighet (`RESEND_API_KEY`)
- Du kommer bli ombedd att klistra in nyckeln

### 2. Skapa edge function: `send-auth-email`
- Tar emot: mottagare, ämne, HTML-innehåll, typ (verification/recovery)
- Skickar via Resend REST API (`https://api.resend.com/emails`)
- Avsändare: `Kampen Sverige <sverigekampen@kampen.app>`

### 3. Anpassa registreringsflödet
- Vid registrering: Supabase skapar kontot men vi genererar en egen verifieringslänk/kod
- Appen anropar edge functionen för att skicka verifieringsmail med svenska texter
- Samma sak för "Glömt lösenord"-flödet

### 4. Svenska mailmallar
- Verifieringsmail: Svensk text med bekräftelselänk
- Lösenordsåterställning: Svensk text med återställningslänk

## Tekniska detaljer

### Edge function (`supabase/functions/send-auth-email/index.ts`)
- Använder `RESEND_API_KEY` från hemligheter
- Endpoint: POST till `https://api.resend.com/emails`
- Validerar input och returnerar status

### Ändringar i frontend
- `src/pages/AuthPage.tsx`: Efter `supabase.auth.signUp()` anropas edge functionen för att skicka eget verifieringsmail
- Liknande för lösenordsåterställning

### Begränsning
- Supabase Auth skickar fortfarande sitt standardmail parallellt (kan inte stängas av helt utan dashboard-åtkomst)
- Alternativ: Stäng av "Enable email confirmations" via auth-konfigurationen och hantera verifiering helt manuellt i appen

