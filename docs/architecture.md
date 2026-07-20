# Architektura

## Tech stack

- **React 19 + Vite** — SPA, žádný server-side rendering.
- **Tailwind CSS v4** — přes `@tailwindcss/vite` plugin (ne PostCSS config,
  ne `tailwind.config.js` — v4 se konfiguruje v `vite.config.js` a přes
  `@import "tailwindcss"` v `src/index.css`).
- **Firebase Realtime Database** — jediné úložiště dat. **Ne Firestore** —
  je to jiný produkt s jinými pravidly i jiným SDK, viz
  [`firebase-setup.md`](firebase-setup.md).
- **Firebase Auth** — Anonymní (běžný provoz appky) + Email/Heslo (admin).
- **React Router v7** — routing s `basename` nastaveným na `import.meta.env.BASE_URL`
  (kvůli GitHub Pages subpath, viz [`deployment.md`](deployment.md)).
- **Vitest** — unit testy pro čistou byznys logiku (žádné komponentové testy,
  žádný e2e framework v repozitáři — v1 se drží basic scope).
- **EmailJS** — jen pro odeslání e-mailu při žádosti o smazání staršího zápasu.

## Vrstvy kódu (`src/`)

```
hooks/            čisté funkce (Elo, statistiky) + hooky na čtení z Firebase
services/         zápisy do Firebase (jediné místo, které volá set/update/runTransaction)
utils/            čisté funkce bez závislosti na Reactu ani Firebase
context/          FirebaseContext — inicializace app/auth/db, poskytuje useFirebase()
components/       UI, rozdělené podle featur (Dashboard, GameForm, History, PlayerProfile, Admin, Auth, Common)
```

**Pravidlo, které se vyplatí dodržovat:** `hooks/useEloCalculator.js` a
`hooks/useStats.js` jsou čisté funkce — berou plain JS objekty/pole, nic
nečtou přímo z Firebase a nemají vedlejší efekty. Diky tomu jdou testovat bez
mockování Firebase (viz `*.test.js` vedle nich) a dají se používat jak na
klientovi, tak v `recalculateAllElo` při přepočtu historie. Nová statistika
patří sem, ne do komponenty — komponenta si data jen natáhne přes
`useFirebaseData.js` a předá je čisté funkci.

## Datový tok

1. **Čtení**: komponenta zavolá hook z `hooks/useFirebaseData.js`
   (`usePlayers()`, `useMatches()`, `useGameTypes()`, `useDeletionRequests()`)
   — každý z nich dělá `onValue()` na příslušný Firebase path a vrací
   `{ data, loading }`, kde `data` je objekt klíčovaný podle Firebase ID.
   `toEntries(data)` z téhož souboru ho převede na pole `[{ id, ...values }]`,
   když je pole pohodlnější (typicky pro `.map()` v UI).
2. **Odvozené statistiky**: komponenta předá `data` z kroku 1 do čisté funkce
   v `hooks/useStats.js` (např. `getHeadToHead(matches, idA, idB)`).
3. **Zápis**: komponenta volá funkci ze `services/*.js` (např.
   `saveMultiplayerMatch(db, { gameTypeId, entries })`), která provede
   samotný zápis do Firebase (typicky přes `runTransaction`, pokud se
   zapisuje Elo — viz [`elo-algorithm.md`](elo-algorithm.md)).

Žádná komponenta nevolá `ref()`/`set()`/`update()` z `firebase/database` přímo
— vždy přes `services/`. Díky tomu je jasné, kde hledat všechny mutace dat.

## Auth flow — proč `PinGate` čeká na `user`

`src/components/Auth/PinGate.jsx` po zadání správného PINu **nevykreslí děti
okamžitě** — počká, až `useFirebase().user` přestane být `null` (tedy až
doběhne `signInAnonymously()`). Důvod: `Security Rules` vyžadují `auth != null`
pro čtení. Pokud by se komponenty s `useFirebaseData` hooky (Dashboard,
History, ...) vykreslily dřív, než se stihne dokončit anonymní přihlášení,
jejich první `onValue()` poslech by mohl dostat `permission_denied` dřív, než
by byl uživatel přihlášený — a tenhle první pokus se sám znovu nezopakuje.
Byla to reálná chyba, na kterou jsme narazili při prvním ostrém testu (viz
[`troubleshooting.md`](troubleshooting.md)) — pokud tenhle guard v `PinGate`
někdy odstraníš/přepíšeš, počítej s tím, že se to vrátí.

## Routing

```
/                 Dashboard (GameForm, Leaderboard, Zápas měsíce, Tento týden)
/history          Historie zápasů (self-service edit/delete do 10 min)
/players/:id      Profil hráče
/admin-login      Přihlášení admina (Firebase Auth email/heslo)
/admin            Admin sekce (chráněno client-side guardem na isAdmin)
```

Všechny routy jsou obalené `PinGate` (`src/App.jsx`) — i `/admin-login` a
`/admin` vyžadují napřed platný kancelářský PIN. Admin práva jsou druhá,
nezávislá vrstva nad tím (Firebase Auth email/heslo + záznam v `/admins`).
