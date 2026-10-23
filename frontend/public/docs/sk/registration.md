# Registrácia a strelci

Strelec je osoba v globálnej databáze. Registrácia je prepojenie medzi strelcom a konkrétnou súťažou, s voliteľnými prepísaniami divízie/kategórie/power factor.

## Globálna databáza strelcov

Záložka **Strelci** je globálny fond. Môžete:

- Pridať strelca manuálne
- Hromadne importovať CSV
- Upraviť, soft-delitovať alebo obnoviť ľubovoľného strelca
- Vyhľadávať podľa mena, divízie, regiónu alebo štítku

![Databáza strelcov](/docs/screenshots/registration-list.png)

**Vykonať v aplikácii:** [Pridať nového strelca](app-action:new-shooter)

## Registrovanie strelcov do súťaží

Otvorte záložku **Registrácia** pre aktuálnu súťaž.

- **Pridať existujúceho strelca** — vyhľadajte v globálnej databáze, kliknutím pridajte.
- **Vytvoriť + registrovať inline** — vytvorte nového strelca a pridajte ho v jednom kroku.
- **Upraviť registráciu** — prepíšte divíziu, kategóriu alebo power factor len pre túto súťaž.
- **Hromadná úprava / odstránenie** — označte riadky checkboxmi, potom vykonajte akciu.
- **Zoskupenie strelcov** — označte dva alebo viac riadkov a kliknite na **Zoskupiť vybrané**, alebo potiahnite jeden riadok na druhý. Užitočné, aby priatelia boli v rovnakom squade.

![Úprava registrácie](/docs/screenshots/edit-registration-modal.png)

**Prejsť v aplikácii:** [Záložka Registrácia](app-tab:registration)

## Zoskupenie registrovaných strelcov

Skupina je požiadavka na spoločný squad — „car pool" strelcov, ktorí chcú byť spolu. Skupina sama o sebe **neprideľuje** číslo squadu.

- Skupinu vytvoríte tak, že označíte dvoch alebo viac registrovaných strelcov a kliknete na **Zoskupiť vybrané**, alebo potiahnete riadok jedného strelca na riadok druhého.
- Farebný pás na pravom okraji riadku označuje členstvo v skupine.
- Strelca zo skupiny odstránite kliknutím na farebný pás v jeho riadku. Viacerých strelcov odstránite označením zoskupených riadkov a kliknutím na **Zrušiť skupiny vybraných**.
- Dve existujúce skupiny nie je možné spojiť. Najprv jednu z nich zrušte.
- Ak v modale Squadding priradíte ktoréhokoľvek člena skupiny, celá skupina sa presunie do rovnakého squadu.

Priraďovanie skupín do squad-ov nájdete v [Squady a skupiny](squadding.md).

## Divízie a kategórie

- **Divízia** je trieda zbrane (napr. Production, Standard, Open pre IPSC). Divízie sú ohraničené organizáciou súťaže a typom zbrane.
- **Kategória** je trieda osoby (Regular, Junior, Senior, Super Senior, Lady).
- **Power factor** je Minor alebo Major — ovplyvňuje, ako sa zásahy bodujú (IPSC).

Každá registrácia dedí predvolené hodnoty strelca; môžete ich prepísať pre konkrétnu súťaž cez modal Úprava registrácie.

**Vykonať v aplikácii:** [Pridať registráciu](app-action:add-registration)
