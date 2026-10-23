# Súťaže

Súťaž je najvyššia úroveň v aplikácii. Obsahuje situácie, registrácie, squady, bodovanie a výsledky.

## Zoznam súťaží

Záložka Súťaže zobrazuje všetky súťaže na tomto zariadení. Aktuálna súťaž je zvýraznená.

![Zoznam pretekov](/docs/screenshots/matches-list.png)

### V zozname môžete

- Nastaviť alebo zrušiť súťaž ako aktuálnu
- Otvoriť detail súťaže
- Exportovať súťaž ako IPSCScore JSON alebo Practiscore `.psc`
- Importovať súťaž z JSON, WinMSS alebo Practiscore
- Označiť viac súťaží a vytvoriť z nich pohár
- Vymazať súťaž

**Prejsť v aplikácii:** [Záložka Súťaže](app-tab:matches)

## Import a export súťaží

Pomocou **Importovať súťaž** v hornej časti záložky Súťaže môžete importovať:

- IPSCScore `.match.json`
- WinMSS `.mdb` / `.accdb`
- Practiscore `.psc`

Import WinMSS a Practiscore potrebuje serverovú časť prehliadača/desktopu. Samostatná aplikácia pre Android/iOS ponúka iba možnosť IPSCScore JSON.

Tlačidlom exportu v riadku súťaže vyberiete IPSCScore `.match.json` alebo v prehliadači/desktop aplikácii Practiscore `.psc`.

Pohár z viacerých súťaží vytvoríte tak, že ich označíte checkboxmi a v hromadnej lište zvolíte **Vytvoriť pohár**. Viac v [Poháre](cups.md).

## Vytvorenie súťaže

Otvorte záložku **Súťaže** a kliknite na **+ Nová súťaž**.

![Formulár nových pretekov](/docs/screenshots/create-match-modal.png)

### Vyplňte

- **Názov** — Názov súťaže, ktorý sa zobrazuje v hlavičke a na tlačovinách.
- **Dátum** — Dátum konania súťaže.
- **Organizácia** — IPSC, USPSA, IDPA, 3GUN, NRL22, PRS, NRA, USA Archery alebo ISSF. Určuje, ktoré divízie budú dostupné.
- **Typ zbrane** — Pištoľ, puška, PCC, brokovnica, kombinovaná alebo luk.
- **Úroveň súťaže** — 1 (lokálne) až 5 (majstrovstvá sveta). Kozmetické pole, ktoré sa zobrazuje v hlavičke.

Po uložení sa nová súťaž automaticky nastaví ako **aktuálna súťaž** (tá, ktorá je zobrazená v hlavičke).

**Vykonať v aplikácii:** [Vytvoriť novú súťaž](app-action:new-match)

## Detail súťaže

Kliknutím na riadok súťaže zobrazíte detail s počtom situácií, registrácií a odkazmi na výsledky.

![Detail pretekov](/docs/screenshots/match-detail.png)
