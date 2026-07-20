# Troubleshooting

Reálné problémy, na které jsme narazili při prvním nastavování projektu, a
jak jsme je vyřešili. Než začneš pátrat od nuly, zkontroluj, jestli tvůj
problém není tady.

## "Error saving rules – mismatched input '{' expecting {'function', 'import', 'service', 'rules_version'}"

Vkládáš `firebase.rules.json` do **Firestore** Rules editoru místo
**Realtime Database** Rules editoru — jsou to dva different produkty v
levém menu Firebase konzole. Firestore rules mají úplně jiný jazyk
(`service cloud.firestore { ... }`), Realtime Database čeká čistý JSON.
Detaily viz [`firebase-setup.md`](firebase-setup.md).

## Appka po přihlášení ukazuje úplně prázdno (žádní hráči, žádné typy her), i když v databázi data jsou

Dva časté důvody, oba se projeví **bez viditelné chybové hlášky v appce**:

1. **Anonymous přihlášení není povolené** v Authentication → Sign-in method.
   Pozná se to podle síťového requestu na
   `identitytoolkit.googleapis.com/v1/accounts:signUp`, který vrátí `400`
   (jde vidět v DevTools → Network). Bez ověřeného uživatele Security Rules
   (`auth != null`) zablokují všechna čtení.
2. **Race condition mezi přihlášením a prvním čtením** — pokud by appka
   začala číst z databáze dřív, než se anonymní přihlášení stihne opravdu
   dokončit, první pokus o čtení dostane "přístup odepřen" a sám se
   nezopakuje. Tohle už je v kódu opravené — `PinGate.jsx` teď čeká na
   `useFirebase().user`, než appku vůbec vykreslí (viz
   [`architecture.md`](architecture.md), sekce "Auth flow"). Pokud se tenhle
   problém vrátí, zkontroluj, že tahle podmínka v `PinGate.jsx` pořád existuje.

**Jak to odladit:** otevři DevTools → Network, filtruj na `firebasedatabase.app`
nebo `identitytoolkit`, a sleduj, jestli signUp/lookup requesty vrací `200`.
Pokud ano a appka pořád nic nezobrazuje, zkontroluj přímo v Realtime
Database → Data, jestli jsou data na správné cestě (`/players`, ne
zanořené o úroveň víc omylem, viz další bod).

## Appka lokálně (`npm run dev`) funguje, ale na GitHub Pages je úplně bílá prázdná stránka

Skoro jistě špatný `base` path — appka se ho drží jen na dvě místa:
`vite.config.js` (`VITE_BASE_PATH` fallback) a `.github/workflows/deploy.yml`
(env proměnná ve stejném názvu). Pokud neodpovídají skutečnému názvu
repozitáře, prohlížeč se snaží stáhnout JS/CSS z neexistující cesty (404),
appka se nikdy nespustí a zůstane jen prázdné `<div id="root"></div>` —
žádná chybová hláška v appce samotné, jen bílá stránka.

**Jak to poznat:** otevři `view-source:` na nasazené URL (nebo DevTools →
Elements) a zkontroluj `src`/`href` u `<script>`/`<link>` tagů v `<head>` —
pokud tam je jiná cesta než skutečný název repozitáře (např.
`/dartstats/assets/...` na repu jménem `office_darts_ice`), je to tohle.
Lokální `npm run dev` na to nereaguje, protože Vite dev server `base` pro
lokální servírování ignoruje — chyba se projeví až v produkčním buildu.

**Oprava:** uprav `VITE_BASE_PATH` na obou místech na `/SKUTEČNÝ_NÁZEV_REPA/`
(viz [`deployment.md`](deployment.md)) a pushni znovu.

## V konzoli u nějakého uzlu (např. `admins`) nejde přidat `+` podřazený uzel

Uzel se pravděpodobně vytvořil jako **string leaf** (hodnota `""` nebo
jakákoliv jiná), ne jako objekt — node nemůže mít zároveň hodnotu i děti.
Smaž ho a založ znovu přes **Import JSON** (spolehlivější než klikání na
hover `+` tlačítko, které v konzoli občas nefunguje/mizí). Postup viz
[`scripts.md`](scripts.md).

## Node.js/npm/git nejsou vidět v novém PowerShell okně, i když jsou nainstalované

Po instalaci (např. přes `winget`) se aktualizuje PATH v registru, ale
**už otevřené** procesy/terminály si PATH nenačtou znovu automaticky. Otevři
nové okno terminálu, nebo v PowerShellu ručně:

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

## `npm create vite@latest .` v neprázdné složce selže/skončí zvláštně

Vite scaffolding nemá rád neprázdné cílové složky (tenhle repozitář měl už
`.git`, `README.md` atd.). Bezpečnější je scaffoldovat do dočasné složky a
přesunout výsledek ručně, než řešit `--overwrite`/`--force` flagy, které se
mezi verzemi `create-vite` mění.

## `npm install` trvá extrémně dlouho na Windows (jednotky minut na pár balíčků)

Typicky Windows Defender real-time skenování každého souboru při rozbalování
`node_modules`. Není to chyba projektu — jen počítej s tím, že první
`npm install` po smazání `node_modules` může trvat výrazně déle než na
Linuxu/macOS.
