# Výstupy a exporty

Výsledky môžete exportovať zo záložky **Výsledky**, z detailu **Pohára** a z obrazoviek registrácie a situácií.

![Tlačidlá exportu](/docs/screenshots/export-buttons.png)

## CSV

- **CSV výsledkov** — všetci strelci s celkovým percentuálnym podielom, divíziou a kategóriou.
- **CSV pohára** — aktívna záložka pohára vrátane stĺpcov jednotlivých pretekov, súčtov a nezapočítaných výsledkov.
- **CSV registrácií** — zo záložky Registrácia exportuje zoznam registrácií aktuálnej súťaže.
- **CSV strelcov** — zo záložky Strelci exportuje globálnu databázu strelcov.

CSV súbory sa otvárajú v Exceli, Numbers alebo akejkoľvek tabuľkovej aplikácii.

## PDF

- **Bodovacie hárky** — zo záložky Situácie, bodovacie hárky pre každú situáciu pripravené na tlač.
- **Zoznam squad-ov** — z modalu squadding, pridelenie squad-ov pre potreby strelnice.
- **Výsledky** — formátované PDF výsledkov, pripravené na tlač a vyvesenie na strelnici.
- **Poradie pohára** — z detailu pohára, aktívna záložka so stĺpcami jednotlivých pretekov a súčtami.

## HTML

- **Výsledky** — samostatná HTML stránka s aktuálnym zobrazením výsledkov.
- **Poradie pohára** — samostatná HTML stránka pre aktívnu záložku pohára.

## Tlač

Použite **Tlačiť** na záložke Výsledky alebo na detaile pohára. Rozloženie tlače zodpovedá aktívnej záložke a prípadnému limitu strelcov.

## JSON

- **Export súťaže** — zo záložky Súťaže exportuje súťaž ako súbor IPSCScore `.match.json` so situáciami, registráciami, skóre a výsledkami. Užitočné na zdieľanie nastavenia súťaže s iným zariadením.
- **Import súťaže** — opak: nahradí lokálnu súťaž obsahom JSON súboru.
- **Export Practiscore** — v prehliadači/desktop aplikácii možno súťaž exportovať aj ako súbor `.psc`.

## Import WinMSS a Practiscore

Existujúci súbor WinMSS (`.mdb` / `.accdb`) alebo Practiscore (`.psc`) importujte cez **Súťaže → Importovať súťaž**. Importujú sa súťaž, situácie, strelci, registrácie a skóre. Tieto formáty potrebujú serverovú časť prehliadača/desktopu a v samostatnej aplikácii pre Android/iOS sú skryté.

Podrobnosti nájdete v [Súťaže](matches.md).

## Zálohovanie databázy

Na úplnú zálohu všetkých dát použite **Nastavenia → Databáza**:

- Prehliadač a Electron desktop aplikácia: export `.sql` výpisu databázy.
- Aplikácia pre Android a iOS: export prenosného `.json` snapshotu.

Electron desktop aplikácia dokáže aj automaticky zapisovať zálohy do priečinka každých 30 minút, s delta zmenami po uložení skóre. Viac v [Databáza a zálohy](database.md).

**Vykonať v aplikácii:** [Exportovať výsledky ako PDF](app-action:export-results-pdf)
