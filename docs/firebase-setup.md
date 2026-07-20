# Firebase setup

Rychlý checklist je v [`README.md`](../README.md) v kořeni repa. Tady je
vysvětlení *proč* za jednotlivými kroky, a věci, na které jsme narazili
v praxi (viz i [`troubleshooting.md`](troubleshooting.md)).

## Realtime Database, ne Firestore

Firebase konzole nabízí dva různé databázové produkty v levém menu:
**Realtime Database** a **Firestore Database**. DartStats používá výhradně
**Realtime Database** — jiné API, jiný tvar pravidel, jiná konzole.

Poznáš to podle chybové hlášky při ukládání pravidel: pokud Firebase řekne
`mismatched input '{' expecting {'function', 'import', 'service', 'rules_version'}`,
vkládáš JSON pravidla (`firebase.rules.json`) do **Firestore** Rules editoru
(ten čeká jazyk `rules_version = '2'; service cloud.firestore { ... }`).
Realtime Database má svoji vlastní záložku **Rules** uvnitř **Realtime
Database** sekce v levém menu — tam pravidla patří.

Oba produkty klidně koexistují ve stejném Firebase projektu bez konfliktu —
pokud omylem založíš Firestore navíc, nevadí, appka ho prostě nikdy nepoužije.

## Auth providery — obě jsou povinné

**Authentication → Sign-in method** → musí být zapnuté:

- **Anonymous** — bez tohohle appka vůbec nefunguje pro běžné hráče.
  `PinGate` po zadání PINu na pozadí volá `signInAnonymously()`; pokud
  provider není povolený, request na `identitytoolkit.googleapis.com/v1/accounts:signUp`
  vrátí `400` a appka zůstane bez ověřeného uživatele. Protože Security
  Rules vyžadují `auth != null` pro čtení, appka pak vidí prázdnou databázi
  — **ne chybu**, prostě nic (viz `troubleshooting.md` pro přesný popis, jak
  se to projevuje a jak se to ladí).
- **Email/Password** — jen pro admin přístup (`/admin-login`). Účty se
  nezakládají appkou, ale ručně v **Authentication → Users → Add user**.

## Security Rules (`firebase.rules.json`)

```json
{
  "rules": {
    ".read": "auth != null",
    "game_types": { ".write": "root.child('admins').child(auth.uid).exists()" },
    "players": { ".write": "auth != null" },
    "matches": {
      "$match_id": {
        ".write": "auth != null && (!data.exists() || root.child('admins').child(auth.uid).exists() || data.child('editable_until').val() > now)"
      }
    },
    "deletion_requests": { ".write": "auth != null" },
    "app_meta": { ".write": "auth != null" },
    "admins": { ".read": "auth != null", ".write": false }
  }
}
```

- **Čtení** je otevřené komukoliv ověřenému (anonymně nebo jako admin) — appka
  nemá koncept jednotlivých uživatelských účtů, takže není co dál omezovat.
- **`game_types`** smí zapisovat jen admin — běžný PIN přístup nemůže měnit
  nabídku typů her.
- **`matches/$match_id`**: nový zápas smí založit kdokoliv ověřený
  (`!data.exists()`), existující zápas smí upravit/smazat admin **kdykoliv**,
  nebo kdokoliv ostatní jen dokud `editable_until > now` (10minutové
  self-service okno). Bacha: appka sama počítá a posílá `editable_until` při
  zápisu — pravidla nekontrolují, že klient poslal správnou hodnotu (že se
  rovná `timestamp + 600000`). Pro tuhle appku (jen kancelářský PIN, žádné
  jednotlivé účty) je to přijatelné riziko, ne přehlédnutí.
- **`admins`**: appka do něj nikdy nezapisuje (`.write: false`). Přidání
  admina je vždy ruční krok v konzoli — viz [`scripts.md`](scripts.md),
  sekce "Import JSON".

## Kde appka bere konfiguraci

`src/context/FirebaseContext.jsx` čte `firebaseConfig` z `VITE_FIREBASE_*`
proměnných prostředí (viz `.env.example`). Hodnoty najdeš v **Project
settings → Your apps → SDK setup and configuration**. Tenhle konfigurační
objekt (`apiKey` včetně) **není tajný** — je to standardní součást
klientského JS bundlu u každé Firebase webové appky, bezpečnost zajišťují
Security Rules, ne skrytí téhle konfigurace. Servisní účet
(`FIREBASE_SERVICE_ACCOUNT_KEY`, používaný jen `scripts/seed.js`) je něco
úplně jiného a **ten tajný je** — má plný admin přístup mimo Security Rules.
