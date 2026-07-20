# 🎯 Implementační plán: DartStats v1.0 (Basic)

> ✅ **v1 je implementováno.** Tenhle dokument je zamrzlé původní zadání —
> ponechává se jako historická stopa a zdůvodnění rozhodnutí (proč guest
> koeficient 0.3, proč žádné tvrdé mazání hráčů, atd.). **Pro aktuální stav
> appky, datový model a architekturu viz [`docs/`](docs/README.md).** Nové
> nápady na rozšíření patří do [`docs/future-extensions.md`](docs/future-extensions.md),
> ne sem — tenhle soubor se dál needituje.

Tento dokument je **kompletní a závazné zadání** pro programovacího agenta. Obsahuje veškerá rozhodnutí potřebná k dokončení práce bez dalších dotazů. Pokud agent narazí na nejednoznačnost, která zde není pokryta, má zvolit nejjednodušší možné řešení konzistentní s duchem tohoto dokumentu (basic, spolehlivé, rychlé na ovládání u terče).

**Práce s podagenty:** Dokument je navržený tak, aby ho hlavní agent mohl rozdělit mezi více podagentů podle work packages v sekci 12 — každý WP je samostatně zadatelný, s vlastními vstupy/výstupy a odkazy na relevantní sekce specifikace, nemusí se tedy předávat celý dokument každému podagentovi.

**Rozsah v1.0:** Zapisuje se pouze konečné pořadí zápasu (žádné live scoring po hodech/kolech). Architektura ale musí nechat otevřený prostor pro budoucí rozšíření o "scored" mód (viz sekce 9 – Budoucí rozšíření), takže `game_types` a `GameForm` komponenta musí zůstat modulární.

**Trénink jako mód, ne samostatný typ hry:** Trénink (sólo hra jednoho hráče) není samostatný záznam v `game_types`, ale volitelný mód, který se zapíná u jakéhokoliv typu hry, u kterého to dává smysl (typicky X01 — 301, 501). Řeší to pole `supports_training` u typu hry — viz sekce 3.2 a 4.4.

---

## 1. Tech Stack (beze změny)

- React + Vite
- Tailwind CSS
- Firebase Realtime Database
- Firebase Auth (Anonymní pro běžný provoz appky + Email/Heslo pouze pro admina)
- EmailJS (pouze pro žádosti o smazání starších zápasů)
- **Hosting: GitHub Pages, nasazení přes GitHub Actions** — kompletní konfigurace (base path, routing, CI/CD workflow, secrets) je v sekci 13. Nejde jen o "kam appku dát" — ovlivňuje to i konfiguraci routeru a build procesu od začátku, proto je WP-11 (sekce 12) plnohodnotný work package, ne volitelný dodatek na konec.

---

## 2. Přístupový model (nové oproti původní specifikaci)

Aplikaci používá jedna kancelář sdílená přes jeden odkaz. Nechceme účty pro jednotlivé hráče, chceme jen zabránit tomu, aby appku používal někdo mimo firmu, kdyby odkaz unikl.

### 2.1 "Hráčský" přístup (PIN gate)
- Při prvním otevření appky na zařízení se zobrazí jednoduchá obrazovka s inputem na **4místný PIN**.
- PIN je definován jako proměnná prostředí `VITE_APP_PIN` (v `.env`, výchozí hodnota např. `"1234"` — uveď v `.env.example` s komentářem, ať si to admin před nasazením změní).
- Po správném zadání se do `localStorage` uloží `dartstats_pin_ok = true` a `signInAnonymously()` se provede na pozadí (pro potřeby Firebase pravidel `auth != null`).
- Pokud je PIN v localStorage validní, appka rovnou pokračuje na Dashboard bez opětovného ptaní.
- Špatný PIN → shake animace inputu + červený text, žádné blokování/countdown (je to jen slabá pojistka, ne bezpečnostní prvek).

### 2.2 Admin přístup
- Samostatná route `/admin-login`.
- Firebase Auth Email/Heslo. Admin účet se vytváří ručně přes Firebase konzoli (mimo scope kódu, jen popiš postup v README).
- Po přihlášení admin vidí navíc položku menu "Admin" se sekcemi: Typy her, Žádosti o smazání, Historie (s možností mazat cokoliv, ne jen do 10 minut), **Správa hráčů** (viz 2.3).

### 2.3 Správa hráčů (Admin)

Řeší dvě věci, které nejde svěřit běžnému PIN přístupu: opravu překlepu ve jméně a "odchod" kolegy z firmy, aniž by se ztratila historie zápasů.

**UX flow (záměrně dvoukrokový, ne inline editace v tabulce):**
1. Admin v sekci "Správa hráčů" vidí seznam všech hráčů (stejná komponenta jako našeptávač jinde v appce — vyhledávání podle jména).
2. Kliknutím na hráče se vybere (zvýrazní se řádek), teprve poté se zpřístupní akční tlačítka **"Přejmenovat"** a **"Archivovat"** / **"Obnovit"** (pokud je již archivovaný).
3. **Přejmenovat** → otevře inline textové pole s aktuálním jménem předvyplněným, uloží pouze `players/{id}/name`. Žádný dopad na historii zápasů (ty referencují `player_id`, ne jméno).
4. **Archivovat** → nastaví `players/{id}/is_archived = true`. Archivovaný hráč:
   - zmizí z Leaderboardu (i ze sekce "Neaktivní/Zasloužilí hráči" — úplně skrytý, ne jen přesunutý),
   - zmizí z našeptávače při zakládání nového zápasu/tréninku,
   - **zůstává** dohledatelný přes historii zápasů a jeho profil (`/players/:id`) jde stále otevřít z odkazu v historii — nahoře profilu se zobrazí štítek "Archivovaný hráč".
5. **Obnovit** → nastaví `is_archived = false`, hráč se vrátí do běžného provozu.
- **Žádné tvrdé mazání hráčů.** Cíleně to není součástí v1 — smazání by osiřelo `player_id` reference v historických zápasech. Archivace řeší reálný use-case ("kolega odešel") bez tohoto rizika.

---

## 3. Datový model (Firebase Realtime DB) — aktualizovaný

### 3.1 `/players`
```json
{
  "players": {
    "player_uid_001": {
      "name": "Richard Ředina",
      "is_guest": false,
      "is_archived": false,
      "elo": 1000,
      "games_played": 0,
      "current_win_streak": 0,
      "last_played_timestamp": null,
      "created_at": 1783500000
    }
  }
}
```
Pole `current_win_streak` je nové — viz sekce 6.3 (gamifikace). Pole `is_archived` je nové — viz sekce 2.3 (Správa hráčů). Odznáčky (bronz/stříbro/zlato, sekce 6.6) a avatar (sekce 6.9) se **nikde neukládají** — počítají/generují se za běhu z `games_played`, respektive z `player_id`, aby se datový model nezbytňoval.

### 3.2 `/game_types` — nový model (bez samostatného typu pro trénink)

Pole `tracking_type` se **ruší**. Nahrazuje ho `supports_training: boolean` — určuje, jestli se u tohoto typu hry v `GameForm` nabídne přepínač "Zápas / Trénink". Mód konkrétního zápasu (multiplayer vs. training) se ukládá až do `/matches` (pole `mode`, viz 3.3), ne do `game_types`.

```json
{
  "game_types": {
    "gt_301": { "name": "301", "category": "X01", "supports_training": true },
    "gt_501": { "name": "501", "category": "X01", "supports_training": true },
    "gt_cricket": { "name": "Cricket", "category": "Cricket", "supports_training": true }
  }
}
```

- Admin při vytváření nového typu hry (Admin sekce) zaškrtává checkbox "Umožnit trénink" — výchozí stav je **zaškrtnuto**, admin ho může vypnout u typů her, kde sólo trénink nedává smysl.
- `category` zůstává jen informativní pole (do budoucna pro filtrování/skupiny), nemá vliv na logiku.

### 3.3 `/matches` — přidáno `editable_until` a dvě podoby podle `mode`

**Multiplayer zápas** (`mode: "multiplayer"`) — beze změny oproti původní logice, jen navíc `editable_until`:
```json
{
  "matches": {
    "match_uid_999": {
      "timestamp": 1783512000,
      "editable_until": 1783512600,
      "game_type_id": "gt_501",
      "mode": "multiplayer",
      "is_invalidated": false,
      "results": [
        {
          "player_id": "player_uid_001",
          "rank": 1,
          "elo_before": 1015,
          "elo_change": 12
        }
      ]
    }
  }
}
```

**Trénink** (`mode: "training"`) — jeden hráč, žádné Elo pole, místo `rank` metrika `darts_to_close`:
```json
{
  "matches": {
    "match_uid_888": {
      "timestamp": 1783512000,
      "editable_until": 1783512600,
      "game_type_id": "gt_501",
      "mode": "training",
      "is_invalidated": false,
      "results": [
        {
          "player_id": "player_uid_001",
          "darts_to_close": 27
        }
      ]
    }
  }
}
```

- `editable_until` = `timestamp + 600000` (10 minut v ms), vypočítá se na klientovi při zápisu a ukládá se rovnou do záznamu. Používá se jak pro UI (zobrazit/skrýt tlačítko "Smazat"), tak v Security Rules (viz 8). Platí pro oba módy stejně.
- **Trénink neovlivňuje Elo, `games_played` ani `current_win_streak`.** Je to čistě osobní statistika (viz 4.4). V historii zápasů se zobrazuje spolu s multiplayer zápasy, ale vizuálně odlišený (např. jiná barva štítku "Trénink" místo pořadí).

### 3.4 `/deletion_requests` (beze změny)
Používá se **pouze** pro zápasy starší než 10 minut.

### 3.5 `/admins`
```json
{
  "admins": {
    "FIREBASE_AUTH_UID_ADMINA": true
  }
}
```
UID admina se doplní ručně po vytvoření účtu — popiš tento krok v README, agent ho nemůže provést sám.

### 3.6 `/app_meta` (nové)
```json
{
  "app_meta": {
    "last_seed_version": 1
  }
}
```
Slouží jen k tomu, aby seed skript (sekce 7) věděl, jestli už proběhl, a neduplikoval hráče při opětovném spuštění.

---

## 4. Elo algoritmus — aktualizovaná specifikace

### 4.1 Dynamické K podle počtu odehraných zápasů
```js
function getKFactor(gamesPlayed) {
  return gamesPlayed < 10 ? 40 : 32;
}
```
`gamesPlayed` se bere z hodnoty hráče **před** aktuálním zápasem (tj. `elo_before` stav). Použije se `K_A = getKFactor(gamesPlayed_A)` a `K_B = getKFactor(gamesPlayed_B)` — každý hráč v duelu může mít jiné K, protože jeden může být nováček a druhý ne.

### 4.2 Zbytek algoritmu beze změny
Viz původní specifikace (párové duely, guest koeficient `0.3`, průměr přes N-1 duelů, zaokrouhlení na celá čísla). Implementuj v `src/hooks/useEloCalculator.js` jako čistou funkci:
```js
calculateMultiplayerElo(players: [{id, elo, gamesPlayed, isGuest, rank}]) => [{id, eloChange}]
```
Musí mít unit testy (viz sekce 10) pro:
- 2 hráči, jasná výhra
- 3 hráči, remíza na 2. místě
- zápas obsahující hosta (ověřit koeficient 0.3)
- zápas obsahující hráče s `gamesPlayed < 10` (ověřit vyšší K)

### 4.3 Povýšení hosta na stálého hráče
- V UI hráče (detail profilu, viditelné jen pokud `is_guest: true`) tlačítko **"Povýšit na stálého hráče"**.
- Akce provede **pouze** `players/{id}/is_guest = false`. **Žádný retroaktivní přepočet historických zápasů** — minulé Elo změny zůstávají tak, jak byly spočítané v době zápasu (s guest koeficientem). Od tohoto okamžiku dál se hráč počítá jako plnohodnotný. Toto je záměrné zjednodušení, agent nemá implementovat zpětný přepočet.

### 4.4 Tréninkový mód (sólo, u typů her s `supports_training: true`)

**Kdy se nabízí:** V `GameForm` po výběru typu hry z `/game_types` — pokud má vybraný typ `supports_training: true`, zobrazí se přepínač (dvě velká tlačítka, ne dropdown — kvůli ovládání na tabletu) **"Zápas" / "Trénink"**. Pokud `supports_training: false`, přepínač se vůbec nezobrazí a rovnou se pokračuje do multiplayer formuláře.

**Formulář tréninku (`TrainingForm.jsx`):**
1. Výběr jednoho hráče (stejný našeptávač jako u multiplayeru, ale jen jeden slot).
2. Číselný input "Počet odházených šipek na zavření" (`darts_to_close`) — velká číselná klávesnice, ne obyčejný text input (stejný požadavek jako u multiplayer formuláře — ovládání na tabletu jednou rukou).
3. Uložení zapíše záznam do `/matches` s `mode: "training"` podle schématu v 3.3. **Nejde přes `runTransaction` měnící Elo** — pouze prostý zápis do `/matches` (žádná úprava `/players` kromě `last_played_timestamp`, který se aktualizuje i u tréninku, protože se počítá do podmínky aktivního hráče v leaderboardu, viz původní specifikace 3.2).

**Osobní statistiky z tréninku (profil hráče):**
- "Nejlepší trénink" (`darts_to_close` minimum) a "Průměr posledních 10 tréninků" — zobraz v profilu hráče jako dvě čísla, žádný graf není v basic verzi potřeba.
- Implementuj jako čistou funkci `getTrainingStats(matches, playerId, gameTypeId)` v `useStats.js`.

### 4.5 Přepočet Elo po zneplatnění staršího zápasu

**Proč to nejde stejně jako u self-service smazání (sekce 5.1):** Self-service smazání do 10 minut jednoduše odečte `elo_change` — funguje spolehlivě, protože je prakticky jisté, že mezi zápisem a smazáním neproběhl žádný další zápas týchž hráčů. U **staršího** zápasu (schválení žádosti o smazání admin em, nebo tvrdé smazání z rozšířené historie) už toto neplatí — všechny zápasy odehrané po něm počítaly Elo s hodnotou, která je teď neplatná. Prosté odečtení by dalo špatný výsledek.

**Řešení — kompletní přepočet od nuly, ne kaskádová oprava:**

```js
async function recalculateAllElo(db) {
  // 1. Načti VŠECHNY hráče, VŠECHNY multiplayer zápasy s is_invalidated: false,
  //    seřazené vzestupně podle timestamp.
  // 2. V paměti (ne v DB) inicializuj pro každého hráče:
  //    elo = 1000, gamesPlayed = 0, currentWinStreak = 0
  // 3. Projdi zápasy chronologicky jeden po druhém:
  //    - spočítej Elo změny přes stávající calculateMultiplayerElo()
  //      (stejná funkce jako při živém zápisu, žádná duplicitní logika)
  //    - přepiš v paměti i pole elo_before / elo_change přímo v daném zápasu
  //      (ať historie zůstane auditovatelná a odpovídá přepočtu)
  //    - aktualizuj gamesPlayed a currentWinStreak pro zúčastněné hráče
  // 4. Po projetí všech zápasů zapiš najednou (jeden multi-path update):
  //    - finální stav všech hráčů (elo, games_played, current_win_streak)
  //    - přepsaná pole elo_before/elo_change u dotčených zápasů
  // Tréninkové zápasy (mode: "training") se v kroku 1 přeskakují úplně —
  // nikdy neovlivňovaly Elo, takže do přepočtu nevstupují.
}
```

- Tato funkce je **idempotentní** — spuštění vícekrát za sebou dá vždy stejný výsledek. To umožňuje mít v Adminu i ruční tlačítko "Přepočítat Elo" pro klid v duši, i mimo automatické triggery.
- **Kdy se spouští automaticky:**
  1. Po schválení žádosti o smazání v `/deletion_requests` (nastaví `is_invalidated: true`, pak zavolá `recalculateAllElo`).
  2. Po tvrdém smazání zápasu staršího 10 minut z rozšířené historie v Adminu.
- Pro zápasy **uvnitř** 10minutového self-service okna (sekce 5.1) se `recalculateAllElo` **nepoužívá** — zůstává jednoduchý přímý revert, je levnější a pro tento časový rámec dostatečně přesný.
- **Známé zjednodušení pro v1:** pokud by dva zápasy se stejnými hráči vznikly v překryvu kratším než 10 minut, jednoduchý revert u toho novějšího nemusí být 100% přesný. Riziko je u kancelářského provozu zanedbatelné (typicky jeden zápas po druhém), ale stojí za zmínku v README jako vědomý kompromis, ne skrytá chyba.
- Výkonnostně nevadí procházet kompletní historii při každém zneplatnění — objem dat kancelářské appky (stovky až nízké tisíce zápasů za roky provozu) je pro Realtime DB i klientský JS zanedbatelný.

Implementuj v `src/hooks/useEloCalculator.js` vedle `calculateMultiplayerElo`, jako `recalculateAllElo(players, matches) => { updatedPlayers, updatedMatches }` — čistá funkce, zápis do Firebase (multi-path update) provede volající komponenta (Admin sekce), ne samotná funkce. Musí mít unit test ověřující, že zneplatnění zápasu uprostřed historie správně opraví Elo všech navazujících zápasů.

---

## 5. Self-service oprava chyb (nahrazuje část původního workflow)

Protože appka nemá individuální účty (jen sdílený PIN), právo editovat/smazat zápas **není vázané na konkrétního uživatele**, ale čistě na čas od zápisu.

### 5.1 Do 10 minut od zápisu
- V Historii zápasů se u zápasů s `editable_until > Date.now()` zobrazuje tlačítko **"Upravit"** a **"Smazat"** (místo/vedle 🗑️ ikony pro žádost).
- **Smazat** = tvrdé smazání uzlu z `/matches` + reverze Elo změn u dotčených hráčů (odečíst `elo_change`, snížit `games_played` o 1) uvnitř jedné `runTransaction`. Tréninkové zápasy se mažou stejně prostě — jen smazání uzlu, žádná Elo logika (trénink Elo nikdy neovlivnil).
- **Upravit** = otevře stejný formulář jako při zápisu, předvyplněný daty, po uložení provede smazání starého + zápis nového (jednodušší než složitý diff).
- Po vypršení 10 minut tlačítka zmizí a nahradí je stávající 🗑️ ikona vedoucí na `/deletion_requests` + EmailJS flow (beze změny oproti původní specifikaci).
- **Mazání zápasů starších 10 minut (admin, ať už přes schválení žádosti nebo z rozšířené historie) nepoužívá tento jednoduchý revert** — spouští místo toho plný přepočet `recalculateAllElo()` podle sekce 4.5, protože jednoduché odečtení by u staršího zápasu dalo špatný výsledek.

### 5.2 UI detail
- U zápasů v okně 10 minut zobraz drobný odpočet ("Lze upravit ještě 7 min") — čistě kosmetické, žádná nutnost real-time přepočítávat, stačí `setInterval` co minutu nebo přepočet při renderu.

---

## 6. Nové/upravené UI prvky

### 6.1 Head-to-head statistika
- V profilu hráče (`/players/:id`) nová sekce "Vzájemné zápasy".
- Pro vybraného druhého hráče (dropdown se všemi ostatními hráči) zobraz: počet vzájemných výher/proher/remíz, spočítáno průchodem `/matches` a porovnáním `rank` obou hráčů v témže zápase (nižší rank = výhra), ignoruj `is_invalidated: true` zápasy.
- Implementuj jako čistou funkci v `src/hooks/useStats.js`: `getHeadToHead(matches, playerIdA, playerIdB)`.

### 6.2 Forma za posledních 30 dní
- Vedle jména v Leaderboardu malá šipka nahoru/dolů (zelená/červená) + číslo = součet `elo_change` ze zápasů za posledních 30 dní. Pokud 0 nebo žádný zápas, nezobrazuj nic.

### 6.3 Aktuální série výher
- Pole `current_win_streak` na hráči se aktualizuje při každém zápisu zápasu v téže transakci jako Elo:
  - pokud hráč skončil na `rank: 1` → `current_win_streak += 1`
  - jinak → `current_win_streak = 0`
- Zobraz v Leaderboardu jako malý badge "🔥 3" pokud streak ≥ 3 (menší streaky nezobrazuj, ať to nepůsobí nafouknutě).

### 6.4 Zápas měsíce
- Na Dashboardu karta "Zápas měsíce" — najdi z `/matches` za aktuální kalendářní měsíc ten, kde `Math.abs(elo_change)` libovolného výsledku je nejvyšší. Zobraz hráče, výsledek, datum. Čistě read-only výpočet, žádný nový zápis do DB.

### 6.5 Nemesis
- V profilu hráče, hned vedle/pod sekcí Head-to-head (6.1), řádek "Nemesis: {jméno} ({X} výher, {Y} proher)".
- Nemesis = soupeř s nejhorším poměrem výher u daného hráče, **ale jen pokud proti sobě odehráli aspoň 3 zápasy** (aby jeden prohraný zápas z minula nevytvořil zavádějící "věčnou noční můru" na základě jednoho vzorku).
- Implementuj jako čistou funkci `getNemesis(matches, playerId, minGames = 3) => { opponentId, wins, losses } | null` v `useStats.js`, znovupoužij `getHeadToHead` interně místo duplikování logiky porovnávání `rank`. Pokud žádný soupeř nesplňuje `minGames`, sekce se v profilu vůbec nezobrazí.

### 6.6 Odznáčky za odehrané zápasy
- Prahy: **bronz** při `games_played >= 50`, **stříbro** při `>= 100`, **zlato** při `>= 200`. Počítá se jen z `games_played` (tedy jen multiplayer zápasy — trénink se do toho nepočítá, viz 4.4).
- Implementuj jako konfigurovatelné pole, ne natvrdo zřetězené `if`, ať se dá později snadno přidat další práh:
  ```js
  const BADGE_THRESHOLDS = [
    { threshold: 50, label: 'Bronz', icon: '🥉' },
    { threshold: 100, label: 'Stříbro', icon: '🥈' },
    { threshold: 200, label: 'Zlato', icon: '🥇' },
  ];
  // zobrazí se ikona nejvyššího dosaženého prahu
  ```
- Zobraz v profilu hráče (ikona + popisek, např. "🥈 Stříbro — 100+ odehraných zápasů") a jako malou ikonu (bez popisku) vedle jména v Leaderboardu, ve stejném stylu jako badge série výher (6.3).

### 6.7 Týdenní přehled
- Na Dashboardu karta "Tento týden" (pondělí 00:00 — neděle 23:59, lokální čas zařízení).
- Obsah: celkový počet odehraných multiplayer zápasů za týden, hráč s nejvíc výhrami (`rank: 1`) za týden, hráč s nejvyšším součtem `elo_change` za týden ("největší formu"). Ignoruj `is_invalidated: true` a tréninkové zápasy.
- Implementuj jako čistou funkci `getWeeklyRecap(matches, players, referenceDate = new Date()) => { totalMatches, mostWins: {playerId, count}, bestForm: {playerId, eloGain} }` v `useStats.js`. Pokud za týden neproběhl žádný zápas, karta zobrazí jen "Tento týden se ještě nehrálo" bez dalších čísel.

### 6.8 Zahrát znovu se stejnou sestavou
- V `RankOnlyForm.jsx` (multiplayer zápis) nad seznamem hráčů tlačítko **"Stejná sestava jako minule"**, viditelné jen pokud existuje aspoň jeden předchozí multiplayer zápas.
- Po kliknutí načte hráče (`player_id` v pořadí, v jakém byli naposledy uloženi) z **posledního multiplayer zápasu na zařízení** (bez ohledu na typ hry — jde o to ušetřit opakované vybírání jmen, ne o vazbu na konkrétní hru) a předvyplní jimi řádky formuláře. Uživatel dál normálně zadává nové pořadí — tlačítko předvyplňuje jen *koho*, ne výsledek.
- Pokud byl mezi hráči poslední sestavy někdo mezitím archivovaný (2.3), při předvyplnění ho vynech a zobraz drobné upozornění "Vynechán archivovaný hráč: {jméno}".

### 6.9 Auto-generovaný avatar (identicon)
- Každý hráč má výchozí vizuální identitu bez nutnosti nahrávat cokoliv — inspirováno GitHub identicony: **5×5 mřížka čtverečků**, generovaná deterministicky z hashe `player_id` (ne jména — přejmenování dle 2.3 tak avatar nezmění).
- Algoritmus (čistá funkce `generateIdenticon(seed: string) => svgString` v `src/utils/identicon.js`):
  1. Spočítej jednoduchý číselný hash ze `seed` (např. FNV-1a nebo obdobný krátký hash, žádná kryptografická knihovna není potřeba).
  2. Z hashe odvoď barvu (např. `hue = hash % 360`, pevná saturace/světlost pro čitelnost).
  3. Z dalších bitů hashe naplň levé 3 sloupce mřížky 5×5 (15 buněk) hodnotami 0/1 (vyplněno/prázdno), pravé 2 sloupce zrcadli podle levých 3 (klasický symetrický identicon vzor).
  4. Vyrenduj jako `<svg>` s barevnými `<rect>` elementy podle vyplněných buněk.
- Komponenta `Avatar.jsx` (`src/components/Common/Avatar.jsx`) přijímá `player` a `size` (`sm`/`md`/`lg`), interně volá `generateIdenticon(player.id)`. Použij ji v našeptávači (GameForm), Leaderboardu a v hlavičce profilu hráče.
- Vlastní nahraná fotka **není součástí v1** — viz sekce 9 (Budoucí rozšíření), kde je i důvod (vyžaduje Firebase Storage, které není v aktuálním stacku).

### 6.10 Potvrzovací modál při zápisu jen s jedním hráčem
- V `RankOnlyForm.jsx` při kliknutí na "Uložit zápas" s pouze jedním vyplněným hráčem se **neuloží rovnou ani se neblokuje tvrdě** — zobrazí se potvrzovací modál:
  - Nadpis: "Zadáváte zápas jen s jedním hráčem"
  - Text: "Pokud jde o trénink, přepněte na mód Trénink pro sledování osobních statistik."
  - Tlačítka: **"Přepnout na Trénink"** (zavře modál, přepne formulář do `TrainingForm.jsx` a předvyplní stejného hráče), **"Uložit i tak"** (pokračuje v uložení multiplayer zápasu s jedním hráčem — Elo algoritmus to zvládne, `N-1 = 0` se ošetří jako "žádná změna Elo" bez chyby), **"Zrušit"** (zavře modál, vrátí na formulář).
- S 0 vyplněnými hráči zůstává tlačítko "Uložit zápas" jednoduše neaktivní (`disabled`), žádný modál není potřeba.

### 6.11 Upozornění na podobné/duplicitní jméno hráče
- Při zakládání nového stálého hráče ("Nový kolega") i nového hosta ("Přidat hosta") appka před zápisem porovná zadané jméno s existujícími hráči (včetně archivovaných, viz 2.3 — nemá smysl založit duplicitu jen proto, že originál je archivovaný).
- Porovnání: normalizace (trim, lowercase, odstranění diakritiky) pro přesnou shodu, plus jednoduchá Levenshteinova vzdálenost ≤ 2 na normalizovaném řetězci pro odchycení překlepů ("Ředina" vs "Rendina").
- Implementuj jako čistou funkci `findSimilarPlayer(name, players) => Player | null` v `src/utils/formatters.js` (nebo nový `src/utils/similarity.js`), včetně jednoduché vlastní Levenshtein implementace (žádná externí knihovna není pro tuto velikost potřeba).
- Pokud se najde shoda, zobraz modál: "Podobný hráč už existuje: {jméno}. Opravdu chcete založit nového, nebo jste chtěli vybrat existujícího?" s tlačítky **"Vybrat existujícího"** (vyplní tohoto hráče do formuláře zápasu místo založení nového) / **"Založit i tak"** / **"Zrušit"**.

---

## 7. Seed data — počáteční hráči

Při prvním spuštění (kontrola přes `/app_meta/last_seed_version`) appka (nebo samostatný jednorázový skript `scripts/seed.js` spouštěný přes `node`) vytvoří tyto tři hráče:

```json
{
  "players": {
    "player_richard_redina": {
      "name": "Richard Ředina",
      "is_guest": false,
      "is_archived": false,
      "elo": 1000,
      "games_played": 0,
      "current_win_streak": 0,
      "last_played_timestamp": null,
      "created_at": <timestamp_at_seed_time>
    },
    "player_jakub_hejc": {
      "name": "Jakub Hejč",
      "is_guest": false,
      "is_archived": false,
      "elo": 1000,
      "games_played": 0,
      "current_win_streak": 0,
      "last_played_timestamp": null,
      "created_at": <timestamp_at_seed_time>
    },
    "player_martin_matych": {
      "name": "Martin Mátych",
      "is_guest": false,
      "is_archived": false,
      "elo": 1000,
      "games_played": 0,
      "current_win_streak": 0,
      "last_played_timestamp": null,
      "created_at": <timestamp_at_seed_time>
    }
  },
  "game_types": {
    "gt_301": { "name": "301", "category": "X01", "supports_training": true },
    "gt_501": { "name": "501", "category": "X01", "supports_training": true },
    "gt_cricket": { "name": "Cricket", "category": "Cricket", "supports_training": true }
  },
  "app_meta": { "last_seed_version": 1 }
}
```

Preferovaný přístup: samostatný Node skript `scripts/seed.js`, který se spustí ručně jednou po nastavení Firebase projektu (`node scripts/seed.js`), používá Firebase Admin SDK a servisní účet z `.env` (`FIREBASE_SERVICE_ACCOUNT_KEY` — jen lokálně, nikdy necommitovat). Skript musí být idempotentní — pokud `last_seed_version >= 1`, vypíše hlášku a nic neudělá.

---

## 8. Firebase Security Rules — aktualizované

```json
{
  "rules": {
    ".read": "auth != null",
    "game_types": {
      ".write": "root.child('admins').child(auth.uid).exists()"
    },
    "players": {
      ".write": "auth != null",
      ".indexOn": ["elo", "is_guest", "is_archived", "last_played_timestamp"]
    },
    "matches": {
      ".indexOn": ["timestamp", "game_type_id"],
      "$match_id": {
        ".write": "auth != null && (
          !data.exists() ||
          root.child('admins').child(auth.uid).exists() ||
          (data.exists() && data.child('editable_until').val() > now)
        )"
      }
    },
    "deletion_requests": {
      ".write": "auth != null"
    },
    "app_meta": {
      ".write": "auth != null"
    },
    "admins": {
      ".read": "auth != null",
      ".write": false
    }
  }
}
```

Poznámka k `.indexOn` u `players`: `elo` pro řazení leaderboardu, `is_guest` pro filtrování hostů, `is_archived` pro vyfiltrování archivovaných hráčů z leaderboardu i našeptávače, `last_played_timestamp` pro aktivní/neaktivní logiku (sekce 3.2 původní specifikace, beze změny). U `matches`: `timestamp` pro historii řazenou od nejnovějších, `game_type_id` pro budoucí filtrování podle typu hry.

---

## 9. Budoucí rozšíření (NEIMPLEMENTOVAT v v1, pouze nechat prostor v architektuře)

- Live zápis skóre po kolech pro 501/301 (multiplayer i trénink), výpočet checkout %, průměru na hod, počtu 180. Přidá se jako nový mód vedle `"multiplayer"` a `"training"` (např. `"multiplayer_scored"`), ne jako nový typ hry. `GameForm` komponenta musí mít připravené místo pro budoucí `GameForm/ScoredForm.jsx`, ať se dá dodat bez přepisu zbytku appky.
- Vlastní nahraná fotka hráče místo auto-generovaného identiconu (6.9) — vyžaduje přidat Firebase Storage do stacku (aktuálně tam není) a nové pole `players/{id}/avatar_url`. `Avatar.jsx` komponenta (6.9) by v tu chvíli měla dostat prioritu: pokud `avatar_url` existuje, zobraz fotku, jinak fallback na identicon — takže komponentu už teď piš s tímto přepínáním na mysli (i když pole `avatar_url` v v1 nikde nevzniká).
- Nerozšiřovat datový model nad rámec tohoto dokumentu — žádné pole navíc "pro jistotu".

---

## 10. Testování

- Unit testy (Vitest) pro `useEloCalculator.js` — 4 scénáře ze sekce 4.2, plus:
  - `recalculateAllElo()` (4.5): ověřit, že zneplatnění zápasu uprostřed historie správně opraví Elo všech navazujících zápasů, a že funkce je idempotentní (druhé spuštění nezmění výsledek).
  - `calculateMultiplayerElo()` s jedním hráčem (N=1, viz 6.10): nesmí spadnout na dělení nulou, výsledná změna Elo je 0.
- Unit test pro `getHeadToHead()` — ověřit správné počítání výher/proher na malém mock datasetu.
- Unit test pro `getNemesis()` (6.5) — ověřit práh `minGames` a že bez dostatku zápasů vrátí `null`.
- Unit test pro `getWeeklyRecap()` (6.7) — ověřit správné hranice týdne (pondělí–neděle) a chování při 0 zápasech.
- Unit test pro `generateIdenticon()` (6.9) — stejný seed musí vždy vrátit stejný výstup (deterministický).
- Unit test pro `findSimilarPlayer()` (6.11) — ověřit přesnou shodu i shodu na základě Levenshteinovy vzdálenosti.
- Manuální test checklist (napiš do `README.md`):
  1. PIN gate funguje, špatný PIN neprojde, správný uloží do localStorage.
  2. Zápis multiplayer zápasu → Elo se správně změní u všech hráčů.
  3. Smazání zápasu do 10 minut → Elo se korektně vrátí zpět.
  4. Zápas starší 10 minut → tlačítko Smazat zmizí, nabídne se jen žádost přes email.
  5. Povýšení hosta → `is_guest` se změní, historické zápasy zůstanou beze změny.
  6. Admin login funguje, běžný hráčský PIN k admin sekci nemá přístup.
  7. U typu hry se `supports_training: true` se v GameForm nabídne přepínač Zápas/Trénink; u typu s `false` se přepínač nezobrazí.
  8. Zápis tréninku neovlivní Elo, `games_played` ani `current_win_streak` vybraného hráče, pouze `last_played_timestamp`.
  9. Admin schválí žádost o smazání staršího zápasu → proběhne `recalculateAllElo`, Elo všech dotčených hráčů (i těch, kteří hráli později) odpovídá přepočtu.
  10. Admin přejmenuje hráče → jméno se změní všude (Leaderboard, historie, profil), historie zápasů zůstane funkční.
  11. Admin archivuje hráče → zmizí z Leaderboardu i našeptávače, profil je stále dostupný z odkazu v historii se štítkem "Archivovaný hráč".
  12. Zápis multiplayer zápasu s jedním hráčem → zobrazí se potvrzovací modál (6.10), ne tvrdé zablokování.
  13. Založení hráče s jménem podobným existujícímu → zobrazí se upozornění (6.11).

---

## 11. Struktura projektu (aktualizovaná)

```text
dartstats/
├── public/
├── scripts/
│   └── seed.js
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── Common/
│   │   │   ├── Avatar.jsx
│   │   │   └── ConfirmModal.jsx
│   │   ├── Dashboard/
│   │   │   ├── MatchOfTheMonth.jsx
│   │   │   └── WeeklyRecap.jsx
│   │   ├── GameForm/
│   │   │   ├── RankOnlyForm.jsx
│   │   │   ├── TrainingForm.jsx
│   │   │   └── index.jsx
│   │   ├── History/
│   │   ├── PlayerProfile/
│   │   │   └── HeadToHead.jsx
│   │   ├── Admin/
│   │   │   └── PlayerManagement.jsx
│   │   └── Auth/
│   │       ├── PinGate.jsx
│   │       └── AdminLogin.jsx
│   ├── context/
│   │   └── FirebaseContext.jsx
│   ├── hooks/
│   │   ├── useEloCalculator.js
│   │   ├── useEloCalculator.test.js
│   │   ├── useStats.js
│   │   └── useStats.test.js
│   ├── utils/
│   │   ├── formatters.js
│   │   ├── identicon.js
│   │   ├── identicon.test.js
│   │   ├── similarity.js
│   │   └── similarity.test.js
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── .github/
│   └── workflows/
│       └── deploy.yml
├── firebase.rules.json
├── README.md
├── tailwind.config.js
└── vite.config.js
```

---

## 12. Rozdělení práce mezi podagenty (Work Packages)

Tento plán je navržený tak, aby ho hlavní (orchestrující) agent mohl rozdělit mezi několik podagentů pracujících paralelně, ne nutně lineárně jeden po druhém. Každý work package (WP) níže je **samostatně zadatelný úkol** — má jasně definovaný cíl, na čem závisí, co potřebuje mít k dispozici od jiných WP (vstupní rozhraní) a co sám produkuje (výstupní rozhraní), aby na to mohly navázat další WP, aniž by jejich autor musel číst celý tento dokument od začátku do konce.

**Pravidla pro orchestrujícího agenta:**
- WP se stejnou vrstvou (viz graf závislostí níže) lze zadat paralelně.
- Než orchestrátor označí WP za hotový, ověří akceptační kritéria daného WP — ne jen že podagent nahlásil "hotovo".
- Pokud podagent narazí na nejednoznačnost nepokrytou tímto dokumentem, neptá se uživatele — řídí se stejným principem jako v úvodu dokumentu (nejjednodušší řešení konzistentní s duchem "basic, spolehlivé, rychlé na ovládání u terče") a rozhodnutí stručně zapíše do commit zprávy nebo README, ať je dohledatelné.
- Odkazy "sekce X.Y" v popisu WP odkazují na číslované sekce tohoto dokumentu — podagent si otevře jen ty, ne celý dokument, pokud to stačí.

### Graf závislostí (vrstvy — vše v jedné vrstvě lze dělat paralelně)

```
Vrstva 0:  WP-00 (Scaffolding)
              │
Vrstva 1:  WP-01 (Firebase & Auth)   WP-02 (Datová vrstva: Elo + Stats)   WP-03 (Avatar)   WP-11 (Deploy config)
              │                              │                                │
              └──────────────┬───────────────┴────────────────┬───────────────┘
                              │                                │
Vrstva 2:  WP-04 (GameForm)  WP-05 (Historie)  WP-06 (Dashboard)  WP-07 (Profil hráče)  WP-08 (Admin)  WP-09 (Security Rules)  WP-10 (Seed skript)
                              │
Vrstva 3:                 WP-12 (Integrace, README, finální test)
```

---

### WP-00 — Scaffolding projektu
- **Závisí na:** nic
- **Cíl:** Inicializovat Vite + React + Tailwind projekt se základním routingem, bez byznys logiky. Vytvořit prázdné stránkové komponenty (jen nadpis + placeholder) pro `/`, `/history`, `/players/:id`, `/admin-login`, `/admin`.
- **Vstupní rozhraní:** žádné.
- **Výstupní rozhraní:** funkční `npm run dev`, `npm run build`, `npm test` (Vitest nastavený, i bez testů zatím), routing mezi prázdnými stránkami funguje, Tailwind funguje (ověřit jednou stylovanou komponentou).
- **Reference:** sekce 1, 11.
- **Akceptační kritéria:** `npm run build` proběhne bez chyby, navigace mezi routami v prohlížeči funguje.

### WP-01 — Firebase & Auth
- **Závisí na:** WP-00
- **Cíl:** `FirebaseContext.jsx`, `PinGate.jsx` (2.1), `AdminLogin.jsx` (2.2).
- **Vstupní rozhraní:** routing z WP-00.
- **Výstupní rozhraní:** `useFirebase()` hook/context vystavující DB referenci a auth metody; `<PinGate>` obalující appku; funkční admin login zapisující do Firebase Auth stavu, který jde v jiných WP testovat přes `root.child('admins').child(auth.uid).exists()`.
- **Reference:** sekce 2.1, 2.2.
- **Akceptační kritéria:** správný PIN pustí dál a uloží do localStorage, špatný PIN neprojde; admin login funguje proti Firebase Auth Email/Heslo.

### WP-02 — Datová vrstva: Elo kalkulačka a statistiky
- **Závisí na:** WP-00 (žádná závislost na Firebase — jde o čisté funkce testovatelné na mock datech)
- **Cíl:** Kompletní `useEloCalculator.js` a `useStats.js` podle specifikace, včetně unit testů.
- **Vstupní rozhraní:** žádné (pracuje na plain JS objektech, ne na Firebase referencích).
- **Výstupní rozhraní (přesné signatury, ostatní WP se na ně spoléhají):**
  ```js
  // useEloCalculator.js
  calculateMultiplayerElo(players: [{id, elo, gamesPlayed, isGuest, rank}]) => [{id, eloChange}]
  recalculateAllElo(players, matches) => { updatedPlayers, updatedMatches }
  getKFactor(gamesPlayed) => number

  // useStats.js
  getHeadToHead(matches, playerIdA, playerIdB) => {wins, losses, draws}
  getNemesis(matches, playerId, minGames = 3) => {opponentId, wins, losses} | null
  getWeeklyRecap(matches, players, referenceDate = new Date()) => {totalMatches, mostWins, bestForm}
  getTrainingStats(matches, playerId, gameTypeId) => {best, average}
  ```
- **Reference:** sekce 4.1, 4.2, 4.5, 6.1, 6.5, 6.7, 4.4 (osobní statistiky tréninku).
- **Akceptační kritéria:** všechny scénáře v sekci 10 (unit testy) prochází, žádná funkce nepřistupuje přímo na Firebase (musí zůstat čistě testovatelná).

### WP-03 — Avatar generátor
- **Závisí na:** WP-00
- **Cíl:** `generateIdenticon(seed)` a `<Avatar player size>` komponenta.
- **Vstupní rozhraní:** žádné.
- **Výstupní rozhraní:** `src/utils/identicon.js` s `generateIdenticon(seed: string) => svgString`; `src/components/Common/Avatar.jsx` přijímající `{ player, size }`.
- **Reference:** sekce 6.9.
- **Akceptační kritéria:** stejný seed → vždy stejný vizuál (deterministický unit test), komponenta se dá vyrenderovat izolovaně (Storybook není nutný, stačí ověřit v prohlížeči na testovací stránce nebo v Admin/GameForm po integraci).

### WP-04 — Formulář zápisu zápasu (GameForm)
- **Závisí na:** WP-01 (Firebase zápis), WP-02 (Elo funkce), WP-03 (Avatar v našeptávači)
- **Cíl:** `index.jsx` (přepínač Zápas/Trénink dle `supports_training`), `RankOnlyForm.jsx`, `TrainingForm.jsx`, včetně modálů ze 6.10 a 6.11 a tlačítka ze 6.8.
- **Vstupní rozhraní:** `useFirebase()` z WP-01, `calculateMultiplayerElo` z WP-02, `<Avatar>` z WP-03.
- **Výstupní rozhraní:** funkční zápis multiplayer i tréninkových zápasů do `/matches` a `/players` (přes `runTransaction`), s `editable_until`, `current_win_streak` update.
- **Reference:** sekce 3.2, 3.3, 4.1–4.4, 6.8, 6.10, 6.11.
- **Akceptační kritéria:** viz body 2, 7, 8, 12, 13 v manuálním checklistu (sekce 10).

### WP-05 — Historie zápasů
- **Závisí na:** WP-01, WP-02
- **Cíl:** Seznam zápasů, 10minutové self-service okno (5.1, 5.2), EmailJS žádost o smazání pro starší zápasy.
- **Vstupní rozhraní:** `useFirebase()`, `recalculateAllElo` (i když ho WP-05 sám nevolá — to dělá Admin WP-08 — musí ale zápas označit/poslat do `/deletion_requests` ve správném formátu).
- **Výstupní rozhraní:** komponenta historie použitelná i samostatně (bez závislosti na Dashboardu).
- **Reference:** sekce 5.1, 5.2, 3.4.
- **Akceptační kritéria:** body 3, 4 v manuálním checklistu.

### WP-06 — Dashboard / Leaderboard
- **Závisí na:** WP-02, WP-03
- **Cíl:** Leaderboard s aktivní/neaktivní sekcí (bere v potaz `is_archived`, viz 2.3), badge série výher (6.3), badge odznáčků (6.6), forma za 30 dní (6.2), karta Zápas měsíce (6.4), karta Týdenní přehled (6.7).
- **Vstupní rozhraní:** `useStats` funkce z WP-02, `<Avatar>` z WP-03.
- **Výstupní rozhraní:** samostatně vyrenderovatelný Dashboard (dá se testovat na mock datech bez WP-01, pokud se DB čtení oddělí do jednoho hooku předaného shora).
- **Reference:** sekce 6.2–6.7, 3.2 (původní specifikace, aktivní/neaktivní podmínka).

### WP-07 — Profil hráče
- **Závisí na:** WP-02, WP-03
- **Cíl:** Detail hráče: základní statistiky, Head-to-head (6.1), Nemesis (6.5), tréninkové statistiky (4.4), odznáčky (6.6), tlačítko "Povýšit na stálého hráče" (4.3), avatar (6.9), štítek "Archivovaný hráč" pokud `is_archived`.
- **Vstupní rozhraní:** `useStats` funkce z WP-02, `<Avatar>` z WP-03.
- **Reference:** sekce 4.3, 4.4, 6.1, 6.5, 6.6, 6.9, 2.3.

### WP-08 — Admin sekce
- **Závisí na:** WP-01, WP-02
- **Cíl:** Správa `game_types` (checkbox "Umožnit trénink"), schvalování `/deletion_requests` (s triggerem `recalculateAllElo`), Správa hráčů — přejmenování/archivace (2.3), rozšířená historie s tvrdým mazáním starších zápasů (s triggerem `recalculateAllElo`).
- **Vstupní rozhraní:** `useFirebase()` z WP-01, `recalculateAllElo` z WP-02.
- **Reference:** sekce 2.2, 2.3, 3.2, 4.5.
- **Akceptační kritéria:** body 6, 9, 10, 11 v manuálním checklistu.

### WP-09 — Security Rules
- **Závisí na:** WP-02 (potřebuje finální seznam polí pro `.indexOn`, jinak lze psát draft souběžně od začátku a jen doladit na konci)
- **Cíl:** `firebase.rules.json` podle sekce 8.
- **Výstupní rozhraní:** hotový soubor, nahraný ručně do Firebase konzole (mimo scope kódu — jen zajistit, že soubor v repozitáři odpovídá tomu, co má být v konzoli, a zmínit to v README).
- **Reference:** sekce 8.

### WP-10 — Seed skript
- **Závisí na:** WP-02 (finální schéma `game_types`/`players`)
- **Cíl:** `scripts/seed.js` podle sekce 7, idempotentní přes `/app_meta/last_seed_version`.
- **Reference:** sekce 3.6, 7.

### WP-11 — Nasazení (GitHub Pages)
- **Závisí na:** WP-00 (potřebuje existující `npm run build`/`npm test` skripty, jinak nezávislé na feature práci)
- **Cíl:** `vite.config.js` base path, `basename` v routeru, SPA fallback, `.github/workflows/deploy.yml`.
- **Reference:** sekce 13 (kompletní detailní specifikace).
- **Poznámka:** tento WP lze rozpracovat hned na začátku paralelně s WP-01–03, finální ověření (že build skutečně nasadí funkční appku) ale patří až do WP-12, až existuje kompletní kód k nasazení.

### WP-12 — Integrace, README, finální test
- **Závisí na:** VŠECHNY předchozí WP
- **Cíl:** Sloučit všechny WP do jednoho funkčního celku, projet celý manuální test checklist (sekce 10), napsat `README.md` (nasazení, `.env`, ruční kroky pro admin účet a GitHub Secrets, checklist).
- **Akceptační kritéria:** appka nasazená na GitHub Pages je plně funkční a všech 13 bodů manuálního checklistu (sekce 10) prochází.

---

## 13. Nasazení na GitHub Pages

Aplikace se nahraje do GitHub repozitáře a nasazuje se automaticky přes **GitHub Actions** při každém push do `main`. Nepoužívej ruční `gh-pages` branch push z lokálu — chceme, aby nasazení fungovalo i bez lokálního nastavení, přímo z GitHubu.

### 13.1 Předpoklad názvu repozitáře
Agent nezná finální název repozitáře na GitHubu. Řeš to takto:
- V `vite.config.js` nastav `base` **dynamicky** podle proměnné prostředí, ne natvrdo:
  ```js
  // vite.config.js
  export default defineConfig({
    base: process.env.VITE_BASE_PATH || '/dartstats/',
    // ...ostatní konfigurace
  })
  ```
- Do `README.md` napiš jasnou poznámku: *"Pokud se repozitář nejmenuje `dartstats`, uprav `VITE_BASE_PATH` v GitHub Actions workflow (`.github/workflows/deploy.yml`) na `/NÁZEV_REPOZITÁŘE/`."*
- Pokud by appka běžela na vlastní doméně (custom domain přes soubor `public/CNAME`), `base` musí být `/` — to ale není součást v1, jen si to nech v README jako poznámku pro budoucnost.

### 13.2 Routing — `basename` a SPA fallback
GitHub Pages neumí server-side rewrite pro SPA routing (běžný problém: obnovení stránky na `/history` vrátí 404).
- V `main.jsx`/`App.jsx` nastav `<BrowserRouter basename={import.meta.env.BASE_URL}>` — Vite automaticky naplní `BASE_URL` hodnotou z `base` ve `vite.config.js`, není potřeba to duplikovat ručně.
- Vytvoř **SPA fallback**: po buildu zkopíruj `dist/index.html` do `dist/404.html` (GitHub Pages servíruje `404.html` při neznámé cestě, což u SPA funguje jako fallback na index). Přidej to jako krok do build procesu (buď npm script `postbuild`, nebo přímo krok v GitHub Actions workflow — preferuj GitHub Actions krok, ať to není skryté v package.json).

### 13.3 GitHub Actions workflow
Vytvoř `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          VITE_BASE_PATH: /dartstats/
          VITE_APP_PIN: ${{ secrets.VITE_APP_PIN }}
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_DATABASE_URL: ${{ secrets.VITE_FIREBASE_DATABASE_URL }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
      - run: cp dist/index.html dist/404.html
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```
- `npm test` je záměrně součástí workflow — pokud selžou unit testy Elo kalkulačky (sekce 10), nasazení se zastaví dřív, než se rozbité Elo dostane do produkce.
- Tento workflow **nepoužívá gh-pages branch ani token** — spoléhá na oficiální GitHub Pages Actions (`upload-pages-artifact` + `deploy-pages`), což je aktuálně doporučený způsob.

### 13.4 GitHub Secrets a nastavení repozitáře (ruční krok — popiš v README, agent to nemůže provést sám)
1. V nastavení repozitáře **Settings → Pages → Build and deployment → Source** nastav na **"GitHub Actions"**.
2. V **Settings → Secrets and variables → Actions** přidej secrets: `VITE_APP_PIN`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` (hodnoty vezmi z Firebase konzole / vlastní volby PINu).
3. Firebase konzole → Authentication → Settings → Authorized domains → přidej doménu `USERNAME.github.io` (jinak anonymní/email přihlášení z nasazené appky nebude fungovat kvůli CORS/domain restriction).
4. Po prvním úspěšném běhu workflow bude appka dostupná na `https://USERNAME.github.io/dartstats/` (uprav podle skutečného názvu repozitáře).

### 13.5 `.env.example` — doplň o `VITE_BASE_PATH`
```
VITE_BASE_PATH=/dartstats/
VITE_APP_PIN=1234
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```
Lokální vývoj (`npm run dev`) funguje i bez `VITE_BASE_PATH` nastaveného — Vite dev server ignoruje `base` pro účely lokálního servírování, hodnota se projeví až v produkčním buildu.
