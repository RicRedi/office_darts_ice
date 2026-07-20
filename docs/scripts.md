# Skripty a jednorázové úlohy

## `scripts/seed.js`

Jednorázový Node skript, který založí počáteční 3 hráče a 3 typy her (viz
`implementation_plan.md`, sekce 7). Používá **Firebase Admin SDK**, ne
klientský SDK — obchází Security Rules úplně, proto potřebuje servisní účet.

**Spuštění:**

```bash
npm run seed
```

**Předpoklady v `.env`:**

```
FIREBASE_SERVICE_ACCOUNT_KEY=<celý obsah JSON souboru servisního účtu, na jeden řádek>
VITE_FIREBASE_DATABASE_URL=<URL tvojí Realtime Database>
```

Servisní účet: **Project settings → Service accounts → Generate new private
key** (stáhne se `.json`). Obsah je potřeba dát na `.env` do jedné hodnoty —
buď ručně minifikovat (odstranit odsazení/nové řádky mimo escapované `\n`
uvnitř `private_key` pole), nebo si nechat pomoct skriptem/agentem, co soubor
přečte a zapíše rovnou zminifikovaný. **Tenhle klíč nikdy necommituj** — má
plný přístup k celému projektu, ne jen k datům appky.

**Idempotence:** skript nejdřív zkontroluje `/app_meta/last_seed_version`.
Pokud je `>= 1`, jen vypíše hlášku a nic neudělá — bezpečné spustit víckrát.

## Alternativa: ruční import přes konzoli (bez servisního účtu)

Pro jednorázové/malé úpravy dat (přidání pár hráčů, typů her, oprava
admina) je často jednodušší **needit servisní účet vůbec** a použít přímo
Firebase konzoli:

1. **Realtime Database → Data.**
2. Najeď na řádek uzlu, který chceš upravit (nebo na kořenový řádek pro
   celou databázi) → tři tečky (⋮) na konci řádku → **Import JSON**.
3. Import na kořenové úrovni **přepíše celou databázi** tím, co nahraješ —
   pokud chceš něco zachovat (typicky `/admins`), musí to být součástí
   importovaného JSON. Import scoped na konkrétní uzel (např. `/game_types`)
   přepíše jen ten podstrom.

Příklad JSON pro založení admina (klíč je Firebase Auth UID z
**Authentication → Users**, viz [`firebase-setup.md`](firebase-setup.md)):

```json
{ "admins": { "TVOJE_UID": true } }
```

**Gotcha, na kterou jsme narazili:** UI konzole pro přidávání jednotlivých
uzlů přes `+` tlačítko je nespolehlivé (hover-based, umí zmizet). Pokud
vytvoříš uzel a omylem necháš vyplněné pole **Value** (i prázdným řetězcem),
Firebase ho uloží jako **string leaf**, ne jako objekt — a pak do něj nejde
nic vnořit (node nemůže mít zároveň hodnotu i děti). Poznáš to podle toho, že
v datovém stromu vidíš `admins: ""` místo `admins: { ... }`. Řešení: smaž ten
uzel a založ ho znovu přes Import JSON (viz výše) — je to spolehlivější než
klikat na `+`.

**Doporučení pro budoucí jednorázové importy:** pojmenuj lokální soubor s
příponou `*.local.json` (např. `my-import.local.json`) — `.gitignore` je
nastavený tak, aby se takové soubory nikdy nedostaly do gitu (obsahují
reálná UID/jména, nepatří do repozitáře).
