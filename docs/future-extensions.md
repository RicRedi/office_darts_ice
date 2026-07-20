# Budoucí rozšíření

Živý seznam nápadů na rozšíření DartStats nad rámec v1. Na rozdíl od
[`implementation_plan.md`](../implementation_plan.md) (zamrzlé zadání pro
v1) je tenhle dokument určený k průběžnému doplňování — přidávej sem nové
nápady stejnou strukturou (Co / Proč ne v v1 / Dopad na datový model /
Poznámky k implementaci), ať se dá kdykoliv v budoucnu vzít a rovnou zadat.

---

## Live zápis skóre (scored mód)

**Co:** Zápis skóre po jednotlivých hodech/kolech pro 501/301 (multiplayer
i trénink) — místo jen konečného pořadí. Umožní odvozené statistiky:
checkout %, průměr na hod, počet 180.

**Proč ne v v1:** V1 je záměrně "basic" — zapisuje se jen konečné pořadí
zápasu, žádné live scoring. Cílem bylo rychlé a spolehlivé ovládání u terče
bez nutnosti zadávat skóre po každém hodu.

**Dopad na datový model:** Nový `mode` v `/matches` vedle `"multiplayer"` a
`"training"` (např. `"multiplayer_scored"`), **ne nový typ hry** — `mode` u
existujícího `game_type_id` (301/501) se jen rozšíří o třetí varianta.
`results[]` by potřebovalo pole navíc pro jednotlivé hody/kola.

**Poznámky k implementaci:** Architektura už na tohle nechává místo:
`GameForm/index.jsx` rozhoduje mezi `RankOnlyForm.jsx` a `TrainingForm.jsx`
podle `mode` — nový `GameForm/ScoredForm.jsx` by šel zapojit stejným
způsobem, bez přepisu zbytku appky. Elo výpočet (`calculateMultiplayerElo`)
by zůstal beze změny — pořád by potřeboval jen `rank`, odvozený z výsledného
skóre.

---

## Vlastní nahraná fotka hráče

**Co:** Nahraná fotka místo auto-generovaného identiconu (viz
[`architecture.md`](architecture.md) — `Avatar.jsx`).

**Proč ne v v1:** Vyžaduje přidat **Firebase Storage** do stacku — aktuálně
appka používá jen Realtime Database + Auth, žádné úložiště souborů.

**Dopad na datový model:** Nové pole `players/{id}/avatar_url`.

**Poznámky k implementaci:** `Avatar.jsx` je už dnes napsaná s touhle
prioritou na mysli — pokud `player.avatar_url` existuje, zobrazí fotku,
jinak spadne na identicon (viz kód, `if (player?.avatar_url) { ... }`).
Zbývá jen: přidat Firebase Storage do projektu, UI pro upload/ořez fotky, a
zápis `avatar_url` při uploadu. Pole v v1 nikde nevzniká.

---

## Elo per typ hry (zvažováno, zatím zamítnuto)

**Co:** Samostatné Elo pro každý typ hry (301/501/Cricket) místo jednoho
globálního čísla napříč všemi typy.

**Proč ne v v1:** Vědomé rozhodnutí při plánování v1 — jednodušší datový
model, jeden leaderboard navíc. Riziko (výhra v Cricketu ovlivní "501
formu") bylo vyhodnoceno jako přijatelné pro kancelářský provoz.

**Dopad na datový model:** `players/{id}/elo` by se změnilo z čísla na mapu
`{ gt_501: 1050, gt_cricket: 980, ... }`. Zasáhlo by to
`useEloCalculator.js`, leaderboard (potřeba přepínač/filtr podle typu hry) a
odznáčky (pravděpodobně by `games_played` muselo jít stejnou cestou).

**Poznámky k implementaci:** Pokud se k tomu půjde, je to spíš "přepsat"
než "přidat" — udělej to jako jeden ucelený refaktor, ne postupné záplaty.

---

## Týmové zápasy (doubles)

**Co:** Podpora zápasů 2v2 (a obecněji N týmů místo N jednotlivců).

**Proč ne v v1:** Vědomé rozhodnutí — model `results[]` počítá s jednotlivci,
každý se svým vlastním `rank`. Přidání týmů je designové rozhodnutí, které
je levnější udělat před napsáním Elo algoritmu než po něm.

**Dopad na datový model:** `results[]` by potřebovalo buď `team_id` pole,
nebo úplně jinou strukturu (pole týmů, každý s polem `player_id`).

**Poznámky k implementaci:** Zatím nerozpracováno — první krok by měl být
rozhodnutí, jak se v týmu dělí Elo změna (rovným dílem? váženě podle
individuálního Elo?), než se cokoliv píše.
