# Google Auth & Server Stabiliteit - Fix Logboek

Dit document bevat de oplossingen voor de kritieke inlog- en serverproblemen die we hebben opgelost. Raadpleeg dit als de inlogknop weer een `403` geeft of als de server crasht.

## 1. De Google Login "403 Forbidden" Fix
Als de Google inlogknop niet verschijnt of een `403` error geeft in de console:

*   **Oorzaak:** Google blokkeert de aanvraag vanwege een mismatch in "Authorized Origins" of een corrupte interne staat in de browser.
*   **De Oplossing (Code):** Gebruik de absolute basisversie van de `<GoogleLogin />` component. Verwijder extra meta-tags zoals `Permissions-Policy` of `Referrer-Policy` als deze niet strikt noodzakelijk zijn, aangezien ze Google's interne origin-check kunnen verstoren.
*   **De Oplossing (Browser):** 
    1.  Open F12 Console -> Tabblad **Application**.
    2.  Klik op **Storage** -> **Clear site data**.
    3.  Herstart de browser volledig (sluit alle vensters).
*   **Google Console:** Zorg dat `http://localhost:5173` (docent) en `http://localhost:5174` (student) EXACT zo in de lijst staan bij "Authorized JavaScript origins", zonder `/` aan het einde.

## 2. Server Crash (TypeScript Compilation Error) Fix
Als de backend niet opstart met foutmeldingen over `otplib` of `qrcode`:

*   **Oorzaak:** TypeScript heeft moeite met de import/export structuur van deze CommonJS bibliotheken in een ESM-achtige omgeving.
*   **De Oplossing:** Gebruik de `require` syntax in plaats van `import` voor deze specifieke bibliotheken:
    ```typescript
    const otplib = require('otplib');
    const { authenticator } = otplib;
    const QRCode = require('qrcode');
    ```
*   **Types:** Installeer altijd de types als dev-dependency: `npm install --prefix server --save-dev @types/qrcode`.

## 3. JSON.parse Error Fix
Als de frontend meldt: `SyntaxError: JSON.parse: unexpected end of data`:

*   **Oorzaak:** De backend is gecrasht of geeft een HTML error pagina terug in plaats van JSON.
*   **Checklist:**
    1.  Kijk in de terminal van de server. Staat daar `🚀 SERVER READY`?
    2.  Check of de `/api/auth/google` endpoint in `index.ts` geen exceptions gooit (gebruik try/catch).
    3.  Controleer of de docent wel in de database staat (via `seed.ts`).

## 4. "Gouden" Configuratie Bestanden
De laatst werkende staat van de kritieke bestanden:
*   **Frontend:** `client-teacher/src/pages/Login.tsx` (Simpele GoogleLogin component).
*   **Backend:** `server/src/index.ts` (ID-token verificatie met OAuth2Client).
*   **DB:** `server/src/db.ts` (Correcte schema's voor 2FA en student-emails).

---
*Laatste update: 13 maart 2026*
