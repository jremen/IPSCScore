# Databáza a zálohy

![Modal nastavení s panelom Databáza](/docs/screenshots/settings-modal.png)

Panel **Databáza** v Nastaveniach exportuje a obnovuje všetky dáta aplikácie. Formát zálohy závisí od prostredia, v ktorom aplikácia beží:

- **Prehliadač a Electron desktop aplikácia** — kompletný `.sql` výpis databázy.
- **Aplikácia pre Android a iOS** — prenosný `.json` snapshot lokálnej databázy v zariadení.

Oba formáty obsahujú celý lokálny súbor dát.

## Manuálny export / import

- **Export** — stiahne kompletný súbor zálohy. Použite ho ako snímku na prenos medzi zariadeniami alebo ako záložnú kópiu.
- **Import** — nahradí **všetky** existujúce dáta obsahom zálohy. Potvrdzovací dialóg varuje, že túto akciu nie je možné vrátiť. Po obnove sa aplikácia znova načíta.

Obe akcie sú dostupné v **Nastavenia → Databáza**. V samostatnej mobilnej aplikácii obnova zároveň zruší aktuálnu administrátorskú reláciu, pretože databáza pod ňou bola nahradená.

## Automatická záloha (iba Electron desktop aplikácia)

Pre priebežnú ochranu nastavte **priečinok záloh** v **Nastavenia → Databáza → Automatická záloha**. Automatická záloha nie je dostupná v prehliadači ani v samostatnej aplikácii pre Android/iOS — tam používajte manuálny export.

1. **Vyberte priečinok** — zvoľte ľubovoľný lokálny priečinok, vrátane priečinka synchronizovaného s iCloud, Google Drive, OneDrive, Dropbox, USB diskom alebo NAS.
2. **Automatická záloha sa spustí po výbere priečinka** — prepínačom ju môžete pozastaviť alebo obnoviť.
3. **Plné zálohy** — kým je zálohovanie zapnuté, aplikácia zapisuje plnú zálohu každých 30 minút a uchováva posledné tri plné zálohy.
4. **Delta zmeny** — po uložení skóre aplikácia zapíše malú delta zmenu. Delta zmeny sa vymažú po úspešnej ďalšej plnej zálohe.
5. **Sledujte stav** — panel zobrazuje čas poslednej plnej zálohy, počet čakajúcich delta zmien a celkovú veľkosť na disku.
6. **Zálohovať teraz** — okamžite spustí plnú zálohu.
7. **Obnoviť z priečinka** — vyberte priečinok záloh, skontrolujte plnú zálohu a reťaz delta zmien a potvrďte. Toto nahradí všetky dáta a znova načíta aplikáciu.

Priečinok záloh musí byť dostupný, aby automatický režim fungoval. Ak je disk odpojený, aplikácia zálohovanie pozastaví a panel zobrazí upozornenie.

## Import WinMSS a Practiscore

Súbory WinMSS (`.mdb` / `.accdb`) a Practiscore (`.psc`) sa importujú cez **Súťaže → Importovať súťaž**, nie cez Nastavenia → Databáza. Tieto parsery bežia v serverovej časti prehliadača/desktopu a v samostatnej aplikácii pre Android/iOS sú skryté.

Postup importu nájdete v [Súťaže](matches.md).
