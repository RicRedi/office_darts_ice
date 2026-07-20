# 🎯 DartStats

Appka pro dlouhodobé sledování šipkových zápasů v kanceláři — Elo žebříček,
historie zápasů, tréninkový mód a lehká gamifikace (série výher, odznáčky,
nemesis, zápas měsíce, týdenní přehled).

Tech stack: React + Vite, Tailwind CSS, Firebase Realtime Database + Auth,
EmailJS, nasazení na GitHub Pages přes GitHub Actions.

📖 **Hlubší dokumentace je v [`docs/`](docs/README.md)** — architektura,
datový model, Elo algoritmus, Firebase setup do detailu a řešení reálných
problémů ([`docs/troubleshooting.md`](docs/troubleshooting.md)). Tenhle
README je jen rychlý start.

---

## 1. Spuštění na localhost

### 1.1 Předpoklady

- Node.js 20+ a npm (`node --version`, `npm --version`)
- Firebase projekt s povolenou **Realtime Database** (viz krok 1.2 níže) —
  appka bez něj sice nastartuje, ale nepůjde se přihlásit ani nic zapsat.

### 1.2 Založení Firebase projektu

1. Na [console.firebase.google.com](https://console.firebase.google.com) založ
   nový projekt.
2. **Build → Realtime Database → Create Database** (zvol region, "start in
   locked mode" je v pořádku, pravidla nahrajeme v kroku 1.5). ⚠️ **Ne
   Firestore Database** — je to jiný produkt s jiným tvarem pravidel, appka
   ho neumí použít. Pokud si nejsi jistý, který jsi založil, viz
   [`docs/firebase-setup.md`](docs/firebase-setup.md).
3. **Build → Authentication → Get started** → záložka **Sign-in method** →
   povol providery **Anonymous** a **Email/Password**. ⚠️ **Anonymous je
   nutné mít zapnuté**, jinak se běžní hráči (bez admin účtu) vůbec
   nepřihlásí a appka bude vypadat jako prázdná/nefunkční bez jakékoliv
   chybové hlášky — viz [`docs/troubleshooting.md`](docs/troubleshooting.md).
4. **Project settings → General → Your apps** → přidej Web app (ikona `</>`),
   nemusíš zaškrtávat Firebase Hosting. Zkopíruj si `apiKey`, `authDomain`,
   `databaseURL`, `projectId`, `appId` — půjdou do `.env`.

### 1.3 `.env`

```bash
cp .env.example .env
```

Vyplň hodnoty z kroku 1.2 (Firebase) a případně vlastní `VITE_APP_PIN`
(výchozí `1234`). `VITE_EMAILJS_*` proměnné jsou potřeba jen pro odesílání
žádostí o smazání starších zápasů e-mailem — bez nich appka funguje, jen se
e-mail neodešle (do konzole se vypíše varování).

### 1.4 Instalace a spuštění

```bash
npm install
npm run dev
```

Vite vypíše lokální URL (typicky `http://localhost:5173/dartstats/` — cesta
`/dartstats/` je tam schválně, viz `VITE_BASE_PATH` níže). Otevři ji
v prohlížeči, zadej PIN a appka by měla naběhnout.

### 1.5 Nahrání Security Rules

V Firebase konzoli **Realtime Database → Rules** vlož obsah souboru
[`firebase.rules.json`](firebase.rules.json) a ulož (Publish). Bez toho appka
sice může číst/zapisovat (výchozí locked-mode pravidla to ale spíš zablokují),
takže tenhle krok nepřeskakuj.

### 1.6 Založení admin účtu

Admin účet se z bezpečnostních důvodů nezakládá kódem:

1. Firebase konzole → **Authentication → Users → Add user** → zadej e-mail
   a heslo, kterým se budeš přihlašovat na `/admin-login`.
2. Zkopíruj **User UID** nově vytvořeného účtu.
3. V **Realtime Database** ručně přidej uzel `admins/<UID>` s hodnotou
   `true` (podle `firebase.rules.json` může do `/admins` zapisovat jen
   Firebase konzole/Admin SDK, ne appka samotná — to je záměr).

### 1.7 Seed dat (volitelné)

Pro počáteční hráče a typy her máš dvě možnosti — detailně obě popsané v
[`docs/scripts.md`](docs/scripts.md):

- **`npm run seed`** — vyžaduje servisní účet (`FIREBASE_SERVICE_ACCOUNT_KEY`
  v `.env`, viz Project settings → Service accounts → Generate new private
  key). Skript je idempotentní, díky `/app_meta/last_seed_version` se při
  opětovném spuštění nic nepřepíše.
- **Ruční import JSON v konzoli** (Realtime Database → Data → ⋮ na kořenovém
  řádku → Import JSON) — rychlejší pro jednorázové/malé úpravy, nepotřebuje
  servisní účet vůbec. Postup a upozornění na časté chyby v
  [`docs/scripts.md`](docs/scripts.md).

---

## 2. Testy a build

```bash
npm test          # Vitest — unit testy Elo kalkulačky a statistik
npm run build      # produkční build do dist/
```

---

## 3. Nasazení na GitHub Pages

1. **Settings → Pages → Build and deployment → Source** → `GitHub Actions`.
2. **Settings → Secrets and variables → Actions** → přidej `VITE_APP_PIN`,
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_PROJECT_ID`,
   `VITE_FIREBASE_APP_ID`, volitelně `VITE_EMAILJS_*`.
3. Firebase konzole → **Authentication → Settings → Authorized domains** →
   přidej `USERNAME.github.io`.
4. Push do `main` appku nasadí automaticky (`.github/workflows/deploy.yml`).
   Po prvním běhu poběží na `https://USERNAME.github.io/dartstats/`.
5. **Pokud se repozitář nejmenuje `dartstats`**, uprav `VITE_BASE_PATH`
   v `.github/workflows/deploy.yml` na `/NÁZEV_REPOZITÁŘE/`.

---

## 4. Vědomá zjednodušení v1 (ne skryté chyby)

- **Self-service revert u zápasů odehraných ve stejném 10minutovém okně**:
  smazání do 10 minut jednoduše odečte `elo_change` místo plného přepočtu.
  Pokud by se stejní hráči utkali podruhé uvnitř téhož okna, revert nemusí
  být 100% přesný — u kancelářského provozu zanedbatelné riziko.
- **Povýšení hosta na stálého hráče** nepřepočítává zpětně historické zápasy
  — jejich Elo změny zůstávají spočítané s guest koeficientem 0.3.
- **EmailJS** je volitelný — bez nastavených `VITE_EMAILJS_*` proměnných se
  žádost o smazání zapíše do `/deletion_requests`, jen se neodešle e-mail.

---

## 5. Manuální test checklist

1. PIN gate funguje, špatný PIN neprojde, správný uloží do localStorage.
2. Zápis multiplayer zápasu → Elo se správně změní u všech hráčů.
3. Smazání zápasu do 10 minut → Elo se korektně vrátí zpět.
4. Zápas starší 10 minut → tlačítko Smazat zmizí, nabídne se jen žádost přes e-mail.
5. Povýšení hosta → `is_guest` se změní, historické zápasy zůstanou beze změny.
6. Admin login funguje, běžný hráčský PIN k admin sekci nemá přístup.
7. U typu hry se `supports_training: true` se v GameForm nabídne přepínač Zápas/Trénink; u typu s `false` se přepínač nezobrazí.
8. Zápis tréninku neovlivní Elo, `games_played` ani `current_win_streak` vybraného hráče, pouze `last_played_timestamp`.
9. Admin schválí žádost o smazání staršího zápasu → proběhne přepočet Elo, hodnoty všech dotčených hráčů (i těch, kteří hráli později) odpovídají přepočtu.
10. Admin přejmenuje hráče → jméno se změní všude (Leaderboard, historie, profil), historie zápasů zůstane funkční.
11. Admin archivuje hráče → zmizí z Leaderboardu i našeptávače, profil je stále dostupný z odkazu v historii se štítkem "Archivovaný hráč".
12. Zápis multiplayer zápasu s jedním hráčem → zobrazí se potvrzovací modál, ne tvrdé zablokování.
13. Založení hráče s jménem podobným existujícímu → zobrazí se upozornění.
