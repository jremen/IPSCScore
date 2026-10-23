# Poháre

Pohár spája viacero pretekov do jedného celosezónneho poradia. V záložke **Poháre** vytvoríte pohár, pridáte preteky a zobrazíte spoločné výsledky.

## Vytvorenie pohára

1. Otvorte záložku **Poháre** a kliknite na **+ Nový pohár**.
2. Zadajte **Názov pohára**.
3. Vyberte **Systém hodnotenia**:
   - **Hit Factor** — každé započítané preteky prispievajú hit faktorom strelca v daných pretekoch. Poradie v pohári určuje súčet najlepších započítaných hit faktorov.
   - **Body** — každé započítané preteky prispievajú bodmi strelca v daných pretekoch. Poradie v pohári určuje súčet najlepších započítaných bodov.
4. Nastavte **Minimálny počet pretekov** — počet platných výsledkov, ktoré strelec potrebuje, aby sa zobrazil v pohári. Ak pole necháte prázdne, použije sa automatická hodnota: viac ako polovica pretekov v pohári (napríklad 3 z 5).
5. Voliteľne nastavte **Minimálny počet účastníkov** — tabuľka divízie, kategórie alebo štítku sa skryje, ak má daná skupina menej kvalifikovaných strelcov.
6. Voliteľne začiarknite **Zobrazené kategórie** — zobrazenie **Podľa kategórie** a exporty budú obsahovať iba začiarknuté kategórie. Ak nezačiarknete žiadnu, zahrnú sa všetky kategórie.
7. Vyberte preteky, ktoré chcete do pohára zaradiť.
8. Kliknite na **Vytvoriť pohár**.

Pohár môžete vytvoriť aj zo záložky **Súťaže**: označte dva alebo viac pretekov a v hromadnej lište zvoľte **Vytvoriť pohár**.

Poháre s režimom Hit Factor prijímajú iba preteky, ktoré obsahujú aspoň jednu situáciu hodnotenú hit faktorom.

## Správa pohára

Kliknutím na riadok pohára otvoríte jeho detail.

- **Upraviť** zmení názov pohára. Systém hodnotenia je iba informačný a v tomto dialógu sa nedá zmeniť.
- **Pridať preteky** pridá do pohára ďalšie preteky.
- Ikona koša pri pretekoch odstráni preteky iba z pohára. Samotné preteky sa nevymažú.
- **Vymazať pohár** odstráni pohár a jeho prepojenia na preteky. Preteky a ich skóre zostanú zachované.

Minimálny počet pretekov, minimálny počet účastníkov a zobrazené kategórie môžete meniť priamo na detaile pohára. Použite tlačidlo **Uložiť** pri príslušnom poli.

## Poradie v pohári

Detail pohára má štyri záložky výsledkov:

- **Podľa divízie** — jedna tabuľka pre každú divíziu.
- **Celkovo** — všetci kvalifikovaní strelci v jednej tabuľke.
- **Podľa kategórie** — sekcie kategórií s tabuľkou pre každú divíziu.
- **Podľa štítku** — sekcie štítkov s tabuľkou pre každú divíziu (užitočné pre kluby alebo tréningové skupiny).

Každá tabuľka zobrazuje jednu očíslovanú skupinu stĺpcov pre každé preteky. Režim Hit Factor zobrazuje pre každé preteky **Body** a **Čas**, plus celkové **Body**, **Čas** a **HF**. Režim Body zobrazuje pre každé preteky **Body** a celkové **Body**. Stĺpec **Súťaž %** porovnáva strelca s najlepším výsledkom v danej tabuľke.

Výsledok sa započítava iba vtedy, ak strelec nie je diskvalifikovaný a v daných pretekoch má aspoň jednu ohodnotenú situáciu. Započítava sa požadovaný počet najlepších platných výsledkov. Prečiarknutá hodnota je platný výsledok mimo započítaných najlepších pretekov. Prázdna bunka znamená, že strelec v daných pretekoch nemá platný výsledok.

Strelec sa nezobrazí, kým nemá dostatok platných výsledkov. Ak počas sezóny zmení divíziu, každá divízia sa hodnotí samostatne.

## Obmedzenie tabuľky

- **Zobraziť všetkých strelcov** — zobrazí všetkých kvalifikovaných strelcov.
- Vypnutím a zadaním čísla zobrazíte iba prvých N strelcov.

Toto obmedzenie platí pre tabuľky na obrazovke aj pre tlač, PDF, CSV a HTML exporty.

## Export výsledkov pohára

Na detaile pohára použite **Tlačiť**, **PDF**, **CSV** alebo **HTML**. Export použije aktívnu záložku, aktuálny limit strelcov a filter zobrazených kategórií.

## Dobré vedieť

Poháre sa počítajú v serverovej časti aplikácie (prehliadač alebo Electron desktop). Samostatná mobilná aplikácia pre Android/iOS zatiaľ zobrazuje iba výsledky jednotlivých pretekov.

**Prejsť v aplikácii:** [Záložka Poháre](app-tab:cups)
