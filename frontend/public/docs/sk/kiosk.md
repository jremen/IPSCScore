# Kiosk režim

Kiosk režim premení verejnú stránku výsledkov na celoobrazovkové zobrazenie pre televízor, projektor alebo druhý monitor. Zobrazuje aktuálnu súťaž, aktualizuje sa pri ukladaní skóre a nevyžaduje prihlásenie.

## Otvorenie kiosk režimu

1. Uistite sa, že súťaž, ktorú chcete zobraziť, je nastavená ako **aktuálna súťaž**.
2. Zistite sieťovú adresu aplikácie z **LAN URL badge** v administrátorskej hlavičke (napríklad `192.168.1.5:3001`).
3. V prehliadači na zobrazovacom zariadení otvorte `/results/kiosk` — napríklad `http://192.168.1.5:3001/results/kiosk`.
4. Prepnite prehliadač do celoobrazovkového režimu.

Štandardná stránka `/results` a jej QR kód naďalej otvárajú bežnú verejnú stránku výsledkov. Kiosk režim má vlastnú adresu a nenahrádza ju.

## Čo zobrazuje

- Názov aktuálnej súťaže a verejný ukazovateľ priebehu súťaže.
- Jednu divíziu naraz. Krátke tabuľky zostanú na obrazovke; dlhé tabuľky sa pomaly posúvajú zhora nadol a potom sa zobrazí ďalšia divízia.
- Indikátor **NAŽIVO** a čas poslednej aktualizácie.
- Poradie, strelca a stĺpce výsledkov, ktoré zodpovedajú typu hodnotenia súťaže.
- Medailové farby pre prvé tri miesta.
- Sekciu DQ v spodnej časti divízie, ak má súťaž diskvalifikovaných strelcov.

Ak súťaž nemá divízie, kiosk zobrazí jednu tabuľku všetkých strelcov. Ak nie je nastavená aktuálna súťaž, zobrazí sa upozornenie.

## Živé aktualizácie

Kiosk režim sleduje aktualizácie skóre a aspoň raz za minútu sa obnoví aj vtedy, ak nie je dostupné živé spojenie. Automaticky sleduje aktuálnu súťaž, takže zmena aktuálnej súťaže v administrácii prepne kiosk na novú súťaž.

## Praktické tipy

- Použite zariadenie v rovnakej sieti ako zariadenie, ktoré zadáva skóre.
- Vypnite uspávanie alebo šetrič obrazovky na zobrazovacom zariadení.
- Kiosk režim je verejný. Ak majú výsledky zostať súkromné, nevystavujte aplikáciu priamo do internetu.
- Kiosk je iba na čítanie — nikto z neho nemôže zadávať skóre.
- Uložte si `/results/kiosk` do záložiek na zobrazovacom zariadení, aby ste ho mohli rýchlo znova otvoriť.
