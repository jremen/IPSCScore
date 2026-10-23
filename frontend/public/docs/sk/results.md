# Výsledky

Otvorte záložku **Výsledky** pre zobrazenie rebríčka. Existuje päť podzáložiek, z ktorých každá preusporiada rovnaké skóre inak.

## Podzáložky

- **Podľa divízie** — jedna tabuľka pre každú divíziu, radené podľa percentuálneho podielu v súťaži.
- **Celkovo** — všetci strelci v jednej tabuľke, divízie ako stĺpce.
- **Podľa situácie** — jedna tabuľka pre každú situáciu, s divíziami vnorenými pod každou.
- **Podľa kategórie** — jedna sekcia pre každú kategóriu, potom tabuľky pre divízie.
- **Podľa štítku** — jedna sekcia pre každý štítok strelca, potom tabuľky pre divízie (užitočné pre klubové vs. otvorené squady).

![Výsledky podľa divízie](/docs/screenshots/results-by-division.png)

**Prejsť v aplikácii:** [Záložka Výsledky](app-tab:results)

## Verejné výsledky a kiosk

Verejná stránka výsledkov na `/results` je iba na čítanie a dostupná bez prihlásenia. Zobrazuje aktuálnu súťaž a je cieľom QR kódu pre výsledky.

Pre televízor alebo projektor otvorte `/results/kiosk`. Kiosk režim automaticky strieda divízie, posúva dlhé tabuľky a zobrazuje živý priebeh súťaže. Viac v [Kiosk režim](kiosk.md).

## Drill-down strelca

Kliknutím na meno strelca v ľubovoľnej tabuľke výsledkov otvoríte súhrnné zobrazenie strelca: každá situácia s jeho raw skóre, penalizáciami, hit faktorom a percentuálnym podielom v súťaži.

## DQ tabuľka

Každé zobrazenie výsledkov má naspodku **DQ tabuľku** s diskvalifikovanými strelcami a ich dôvodom DQ. Tabuľka má červený okraj pre vizuálne odlíšenie.

![Výsledky podľa etapy s DQ tabuľkou](/docs/screenshots/results-by-stage.png)

## Responzívne rozloženie

Tabuľky výsledkov sú responzívne: plná tabuľka dát na počítači, rozloženie kariet na mobile. Rovnaké dáta sú zobrazené — mení sa len vizuálny štýl.

**Vykonať v aplikácii:** [Tlačiť výsledky](app-action:print-results)
