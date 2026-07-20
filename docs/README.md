# Dokumentace DartStats

Tahle složka je určená pro kohokoliv, kdo na projektu bude pokračovat (včetně
budoucího tebe za půl roku). Původní zadání je v
[`implementation_plan.md`](../implementation_plan.md) v kořeni repozitáře —
je to "proč to tak je" pro spoustu rozhodnutí níže a stojí za přečtení, pokud
plánuješ větší změnu, ne jen drobnou opravu.

- [`architecture.md`](architecture.md) — jak je kód poskládaný, kudy tečou data
- [`data-model.md`](data-model.md) — struktura Firebase Realtime Database
- [`elo-algorithm.md`](elo-algorithm.md) — jak se počítá Elo, K-faktor, guest koeficient, přepočet
- [`firebase-setup.md`](firebase-setup.md) — založení Firebase projektu, Auth, Security Rules (i časté omyly)
- [`scripts.md`](scripts.md) — `scripts/seed.js` a ruční import dat přes konzoli
- [`deployment.md`](deployment.md) — nasazení na GitHub Pages
- [`troubleshooting.md`](troubleshooting.md) — reálné problémy, na které jsme narazili při prvním nasazení, a jak se řeší
- [`future-extensions.md`](future-extensions.md) — živý seznam nápadů na rozšíření nad rámec v1 (na rozdíl od `implementation_plan.md` se tenhle dokument průběžně doplňuje)

Rychlý start pro lokální vývoj je v [`README.md`](../README.md) v kořeni repa.
