

## Plan: Fixa så rätt tävlings utmaningar visas

### Problem
Dashboard (`/`) hämtar alltid den senaste aktiva tävlingen, oavsett vilken tävling du klickade "Utmaningar" från. Så när du klickar "Utmaningar" på tävling 2, hamnar du på tävling 1.

### Lösning
1. **`src/pages/CompetitionsPage.tsx`** – Ändra "Utmaningar"-länken från `<Link to="/">` till `<Link to={`/?comp=${comp.id}`}>` så att tävlingens ID skickas med.

2. **`src/pages/Dashboard.tsx`** – Läs `comp` query-parameter med `useSearchParams`. Om den finns, hämta den specifika tävlingen istället för "senaste aktiva". Fallback till nuvarande logik om ingen param finns.

Inga databas-ändringar behövs.

