# Squady a skupiny

Squad je očíslovaná skupina strelcov, ktorí idú na situáciu spolu. Skupina je „car pool" — strelci, ktorí chcú byť v rovnakom squade.

## Skupiny

V záložke Registrácia potiahnite riadok strelca na iný riadok, aby ste ich pridali do skupiny, alebo označte viac riadkov a kliknite na **Zoskupiť vybrané**. Skupiny sú farebne vyznačené na pravom okraji riadku.

Skupiny samy o sebe neprideľujú číslo squadu; iba označia strelcov, ktorí chcú byť spolu. Na pridelenie do squadu použite modal squaddingu.

- Kliknutím na farebný pás v riadku odstránite strelca zo skupiny.
- Označením zoskupených riadkov a kliknutím na **Zrušiť skupiny vybraných** odstránite viacerých naraz.
- Dve existujúce skupiny nie je možné spojiť. Najprv jednu zrušte.
- Ak priradíte ktoréhokoľvek člena skupiny do squadu, všetci členovia skupiny sa presunú do rovnakého squadu.

## Squady

Otvorte modal **Squadding** zo záložky Registrácia.

![Modal družstiev](/docs/screenshots/squadding-modal.png)

### Modal zobrazuje

- **Nepriradení** vľavo, s vyhľadávacím poľom.
- **N stĺpcov squad-ov** vpravo, so strelcami a tlačidlom „Pridať strelca".
- **+ Pridať squad** na konci na vytvorenie nového squadu.
- **Generovať PDF** navrchu na vytlačenie zoznamu squad-ov pre potreby strelnice.

### Presúvanie strelcov

- **Potiahnite kartu strelca** z jedného stĺpca do druhého, aby ste ho priradili alebo prepriradili.
- **Kliknite + Pridať strelca** v stĺpci, aby ste vybrali z nepriradených.
- Tlačidlo „+ Pridať squad" vytvorí nový prázdny stĺpec.

Zmeny sa prepláchnu pri zatvorení modalu, s offline podporou pre nespoľahlivé pripojenia.

## Verejné zobrazenie squad-ov

Ktokoľvek na lokálnej sieti môže otvoriť read-only zobrazenie squad-ov na `/squads` (napr. `http://192.168.1.5:3001/squads`). Automaticky sa obnovuje každých 30 sekúnd.

**Prejsť v aplikácii:** [Záložka Registrácia](app-tab:registration)
