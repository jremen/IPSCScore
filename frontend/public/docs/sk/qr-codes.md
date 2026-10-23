# QR kódy a zdieľanie

Keď aplikácia beží s dosiahnuteľnou sieťovou URL, administrátorská hlavička zobrazuje **LAN URL badge** s odkazmi na tri obrazovky QR kódov. Diváci a hodnotitelia tak môžu pristupovať k aplikácii z vlastných zariadení bez písania URL adries.

## LAN URL badge

Badge zobrazuje sieťovú adresu aplikácie (napr. `192.168.1.5:3001`). Kliknutím skopírujete URL do schránky — vložte ju do prehliadača v telefóne v rovnakej Wi-Fi sieti pre otvorenie aplikácie.

Tri tlačidlá vedľa neho generujú špecializované QR kódy:

## 🏆 QR pre výsledky

![QR modal výsledkov](/docs/screenshots/qr-modal.png)

QR kód pre **verejné výsledky** na `/results`. Každý, kto ho naskenuje, uvidí výsledky aktuálnej súťaže na svojom zariadení v rovnakej sieti, iba na čítanie.

Použite **Vytlačiť** alebo **Stiahnuť PDF** z QR modalu na vytvorenie A4 plagátu pre strelnicu.

## 🎯 QR pre hodnotiteľov

QR kód pre **stránku bodovania** pre hodnotiteľov na `/scoring`. Naskenovaním QR sa otvorí stránka bodovania a na prístup sa použije aktuálny **trust token** bez hesla.

Modal prístupu hodnotiteľa zobrazuje:

- **QR kód** — aktuálna trust URL, ktorú hodnotitelia skenujú
- **URL** — celý odkaz (s `?trustToken=...`) — tlačidlo kopírovania na zdieľanie cez správy
- **Režim schvaľovania zariadení** — určuje, ako sa prijímajú nové zariadenia:
  - **Tichý (automaticky schváliť)** — zariadenie, ktoré naskenuje QR, získa prístup okamžite.
  - **Vyžadovať schválenie** — každé nové zariadenie čaká na rozhodcu. Hodnotiteľ vidí upozornenie **Čaká na schválenie** s prvou časťou ID zariadenia. Zariadenie sa v modale zobrazí v časti **Čaká na schválenie**; kliknutím na **Schváliť** ho povolíte, červeným X ho zamietnete.
- **Aktívne relácie** — schválené zariadenia s názvom zariadenia, ID zariadenia a časom poslednej aktivity. Kliknutím na červené X zrušíte prístup jednému zariadeniu; bude musieť znova naskenovať QR kód.
- **Vyčistiť duplicity** — odstráni duplicitné relácie toho istého zariadenia, ak zoznam obsahuje viac ako jednu reláciu.
- **Rotovať token** — vygeneruje nový trust token a zneplatní všetky existujúce relácie hodnotiteľov. Všetky zariadenia musia naskenovať nový QR kód. Použite to pri podozrení na zneužitie relácie alebo na konci dňa.

Schválenie zariadenia iba povoľuje prístup k stránke bodovania. Neschvaľuje ani nemení skóre strelcov. Skóre ukladá hodnotiteľ; ak pre toho istého strelca a situáciu už existuje iné skóre, neadministrátorské uloženie sa odmietne a zostane pôvodné skóre hostiteľa.

### Ako sa hodnotitelia prihlasujú

1. Rozhodca zobrazí QR kód na svojom zariadení.
2. Hodnotiteľ otvorí fotoaparát telefónu a naskenuje QR kód.
3. Prehliadač otvorí odkaz a token sa automaticky aktivuje — hodnotiteľ sa dostane na stránku bodovania.
4. Ak je zapnuté **Vyžadovať schválenie**, hodnotiteľ počká na schválenie zariadenia rozhodcom a potom klikne na **Už som sa prihlásil** (alebo aplikáciu znova otvorí).
5. Ak hodnotiteľ používa PWA (aplikáciu nainštalovanú na ploche), klikne na **Alebo vložte odkaz** a vloží celú URL skopírovanú z prehliadača.

## 📋 QR pre squady

QR kód pre **verejné zobrazenie squad-ov** na `/squads`. Zobrazuje zoznam rozdelenia do squad-ov podľa nastavenia administrátora, iba na čítanie. Užitočné pre vyvesenie na nástenke strelnice.
