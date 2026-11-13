# mini-DM — instrukcja wdrożenia na serwer demo

|                            |                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------- |
| Wersja aplikacji           | commit `a743b3c` (gałąź `main`)                                                    |
| Poprzednio wdrożona wersja | commit `69b80f5` (wdrożenie z 2026-11-08)                                          |
| Data przygotowania         | 2026-11-13                                                                         |
| Środowisko                 | serwer demo klienta (`<ADRES_DEMO>`), Docker + docker compose, reverse proxy nginx |

## 0. Konto i uprawnienia

Całe wdrożenie wykonuj ze zwykłego konta administratora serwera, `<UZYTKOWNIK>` (zob. punkt 2): przesyłanie plików z Windows przez WinSCP, logowanie przez SSH i polecenia na serwerze. **Nie loguj się jako root.** Wtedy pomyłka w poleceniu `rm` lub `unzip` w złym katalogu nie ma pełnych uprawnień.

- `<UZYTKOWNIK>` musi należeć do grupy `docker` (sprawdź poleceniem `id`). Wtedy `docker build`, `docker tag`, `docker run` i `docker compose` działają **bez `sudo`**, co potwierdzi polecenie `docker ps`. Jeśli zgłasza `permission denied`, wyloguj się i zaloguj ponownie, bo członkostwo w grupie działa dopiero w nowej sesji.
- Konto, z którego uruchamiasz `docker build`, nie ma wpływu na obraz. Obraz i tak buduje demon Dockera, a właściciela plików w obrazie ustala `Dockerfile` (użytkownik `app`).
- `<KATALOG_ZRODEL>` i `<KATALOG_KOPII>` powinny należeć do `<UZYTKOWNIK>`, np. `~/mini-dm-src` i `~/kopie-mini-dm`.
- **`sudo` jest potrzebne tylko** przy operacjach na plikach bazy w `<KATALOG_DANYCH>`, jeśli nie należą one do `<UZYTKOWNIK>`. Dotyczy to `chmod` w kroku 6 oraz przywracania bazy w kroku 9. W tych miejscach polecenia mają już `sudo`.

## 1. Co zawiera to wdrożenie

Zmiany względem `69b80f5`:

1. **Nowe pole „Armator”** (przewoźnik morski), tekst do 50 znaków, niewymagane. Jest tylko na formularzu **edycji** zamówienia, obok pola „Magazyn”. Formularz dodawania zamówienia się nie zmienia. Zmiana armatora trafia do historii zmian zamówienia.
2. **Lista zamówień: kolumna „Cena za kg” zamiast „Wartość”.** Pokazuje cenę portową za kilogram z walutą zamówienia. Wartość zamówienia nadal jest w formularzu edycji, a raport nadal sumuje wartości zamówień.
3. **Lista zamówień: kolumna „Magazyn” zamiast „Dodał”.** Zamówienia bez magazynu pokazują „—”.
4. **Nazwa magazynu: maksymalnie 50 znaków** (wcześniej 100), zarówno w zamówieniu, jak i w słowniku „Magazyny” (strona „Ustawienia”).

**To wdrożenie zmienia strukturę bazy.** Zawiera dwie migracje, wykonywane po kolei przy starcie aplikacji:

- **migracja nr 5 przebudowuje tabelę `purchase_orders`**: nowa kolumna `shipping_line` staje między `warehouse_name` a `has_eur1_certificate`. Istniejące zamówienia dostają puste pole „Armator”.
- **migracja nr 6 przebudowuje tabele `purchase_orders` i `warehouses`** z limitem 50 znaków dla nazwy magazynu. Nazwy dłuższe niż 50 znaków są **skracane** do 50 (tak samo w zamówieniach i w słowniku). Jeśli po skróceniu dwie pozycje słownika byłyby identyczne, zostaje jedna. Krok 4.4 pokazuje, czy na serwerze są takie nazwy.

Pozostałe dane, historia zmian i indeksy zostają zachowane. **Kopia zapasowa bazy (krok 4) jest obowiązkowa.**

Nie zmieniają się zmienne środowiskowe, port (4321) ani konfiguracja `docker-compose.yml` i nginx.

> **Jeśli serwer ma wersję starszą niż `69b80f5`**, to wdrożenie zawiera też zmiany z wcześniejszych wdrożeń: dymek z powodem oznaczenia „wymaga uwagi” (`69b80f5`) i filtr oraz kafelek „Brak badań dostawcy” (`d1b958a`). Jeśli jest starsza niż `95062ff` (sprzed migracji nr 4), zawiera ponadto:
>
> - pole „Badania laboratoryjne od dostawcy”,
> - przeniesione pole „Zablokowane”,
> - poszerzony layout,
> - **migrację nr 4, która również przebudowuje tabelę `purchase_orders`** (wykona się przed migracjami nr 5 i 6).
>
> Różnice w oczekiwanych wynikach opisują uwagi „_starsza wersja_” w krokach 4.4, 8 i 9.

## 2. Oznaczenia używane w instrukcji

| Symbol              | Znaczenie                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| `<UZYTKOWNIK>`      | zwykłe (nie-root) konto na serwerze, w grupie `docker`, używane też w WinSCP                          |
| `<ADRES_DEMO>`      | domena, pod którą działa serwer demo                                                                  |
| `<KATALOG_ZRODEL>`  | katalog na serwerze, w którym budowany jest obraz (kopia repozytorium)                                |
| `<KATALOG_COMPOSE>` | katalog z plikiem `docker-compose.yml`, w którym zdefiniowana jest usługa `mini-dm`                   |
| `<KATALOG_DANYCH>`  | katalog z bazą SQLite, podmontowany w kontenerze jako `/app/data` (bind mount z `docker-compose.yml`) |
| `<KATALOG_KOPII>`   | dowolny katalog na kopie zapasowe, poza `<KATALOG_DANYCH>`                                            |

Rzeczywiste wartości tych oznaczeń celowo nie są zapisane w repozytorium. Ścieżki odczytasz z `docker-compose.yml` na serwerze.

Instrukcja zakłada, że usługa `mini-dm` w `docker-compose.yml` korzysta z obrazu `mini-dm:latest`, tak jak przy poprzednich wdrożeniach.

## 3. Przygotowanie paczki ze źródłami (lokalnie)

Na komputerze deweloperskim, w katalogu projektu:

```bash
git archive --format=zip -o mini-dm-a743b3c.zip a743b3c
```

`git archive` pakuje tylko pliki śledzone przez git. W paczce nie ma więc `node_modules`, `dist`, `.astro`, `data`, `.env*` ani lokalnych konfiguracji.

Skopiuj `mini-dm-a743b3c.zip` na serwer przez WinSCP, logując się jako `<UZYTKOWNIK>`, do katalogu domowego (`~`). Następnie wyczyść `<KATALOG_ZRODEL>` ze starych plików źródłowych i rozpakuj tam paczkę:

```bash
cd <KATALOG_ZRODEL>
unzip -o ~/mini-dm-a743b3c.zip
```

> Nigdy nie rozpakowuj paczki do `<KATALOG_DANYCH>` i nie czyść tego katalogu.

## 4. Zatrzymanie aplikacji i kopia zapasowa bazy

**4.1.** Zachowaj obecny obraz pod osobną nazwą, żeby można było do niego wrócić. Jeśli `mini-dm:prev` został po poprzednim wdrożeniu, zostanie nadpisany, i tak ma być.

```bash
docker tag mini-dm:latest mini-dm:prev
```

**4.2.** Zatrzymaj aplikację. SQLite pozwala na jednego zapisującego, a kopia musi być spójna:

```bash
cd <KATALOG_COMPOSE>
docker compose stop mini-dm
```

**4.3.** Zrób kopię **wszystkich** plików bazy, czyli `mini-dm.db` oraz, jeśli istnieją, `mini-dm.db-wal` i `mini-dm.db-shm`:

```bash
STAMP=$(date +%Y%m%d-%H%M)
mkdir -p <KATALOG_KOPII>/mini-dm-$STAMP
cp -a <KATALOG_DANYCH>/mini-dm.db* <KATALOG_KOPII>/mini-dm-$STAMP/
ls -l <KATALOG_KOPII>/mini-dm-$STAMP/
```

**4.4.** Zanotuj stan bazy przed wdrożeniem. Polecenie uruchamia na chwilę stary obraz w trybie tylko do odczytu:

```bash
docker run --rm -v <KATALOG_DANYCH>:/app/data mini-dm:prev node -e '
const db = require("better-sqlite3")("/app/data/mini-dm.db", { readonly: true, fileMustExist: true });
console.log("zamowienia:", db.prepare("SELECT COUNT(*) AS c FROM purchase_orders").get().c);
console.log("historia:  ", db.prepare("SELECT COUNT(*) AS c FROM purchase_order_history").get().c);
console.log("migracje:  ", db.prepare("SELECT version FROM schema_migrations ORDER BY version").all().map(r => r.version).join(","));
console.log("magazyny >50:", db.prepare("SELECT COUNT(*) AS c FROM purchase_orders WHERE length(trim(warehouse_name)) > 50").get().c,
  "/ slownik:", db.prepare("SELECT COUNT(*) AS c FROM warehouses WHERE length(trim(name)) > 50").get().c);
'
```

Zapisz liczby `zamowienia` i `historia`. Pole `migracje` powinno pokazać `1,2,3,4`.

Pole `magazyny >50` pokazuje, ile zamówień i pozycji słownika ma nazwę magazynu dłuższą niż 50 znaków. Jeśli obie liczby to `0`, migracja nr 6 nie zmieni żadnych danych. Jeśli nie, te nazwy zostaną skrócone do 50 znaków. Możesz je wcześniej poprawić ręcznie w starej wersji (wtedy uruchom ją ponownie: `docker compose up -d mini-dm`, popraw nazwy i wróć do kroku 4.2).

_Starsza wersja:_ jeśli `migracje` pokazuje `1,2,3`, serwer ma wersję sprzed migracji nr 4 (zob. uwagę w punkcie 1).

Jeśli `migracje` pokazuje już `1,2,3,4,5,6`, nowa wersja była już wdrożona. Wdrożenie możesz powtórzyć, migracje nie wykonają się drugi raz. Jeśli pokazuje `1,2,3,4,5`, wykona się tylko migracja nr 6.

## 5. Budowa nowego obrazu

```bash
cd <KATALOG_ZRODEL>
docker build -t mini-dm:latest .
```

Budowa powinna zakończyć się bez błędów. Etap `npm run build` jest w niej wymagany.

## 6. Kontrola uprawnień do plików bazy

Kontener działa jako nieuprzywilejowany użytkownik `app`. Przy jednym z wcześniejszych wdrożeń pliki bazy należały do innego użytkownika z prawami `644`. Aplikacja wtedy startowała i wyświetlała dane, ale **pierwszy zapis kończył się błędem**.

```bash
ls -l <KATALOG_DANYCH>/
```

Jeśli pliki `mini-dm.db*` nie mają praw zapisu dla „others” (`-rw-rw-rw-`), wykonaj:

```bash
sudo chmod 666 <KATALOG_DANYCH>/mini-dm.db*
```

Sam katalog również musi być zapisywalny dla kontenera (wcześniej miał prawa `777`).

## 7. Uruchomienie nowej wersji

```bash
cd <KATALOG_COMPOSE>
docker compose up -d mini-dm
docker compose logs --tail 50 mini-dm
```

W logach **nie** powinno być błędów typu `Migration ...`, `SQLITE_...` ani `foreign key violation`. Migracje nie wypisują komunikatu o sukcesie, więc brak błędów i działający serwer oznaczają, że start się udał.

Każda migracja działa w osobnej transakcji. Jeśli któraś się nie powiedzie, jej zmiany są wycofane, a kontener nie wystartuje (w logach będzie błąd). Przejdź wtedy do kroku 9.

## 8. Weryfikacja

**8.1. Baza.** Uruchom to samo sprawdzenie co w kroku 4.4, tym razem na nowym obrazie, z dodatkowym sprawdzeniem kolumn:

```bash
docker run --rm -v <KATALOG_DANYCH>:/app/data mini-dm:latest node -e '
const db = require("better-sqlite3")("/app/data/mini-dm.db", { readonly: true, fileMustExist: true });
console.log("zamowienia:", db.prepare("SELECT COUNT(*) AS c FROM purchase_orders").get().c);
console.log("historia:  ", db.prepare("SELECT COUNT(*) AS c FROM purchase_order_history").get().c);
console.log("migracje:  ", db.prepare("SELECT version FROM schema_migrations ORDER BY version").all().map(r => r.version).join(","));
const cols = db.prepare("PRAGMA table_info(purchase_orders)").all().map(c => c.name);
console.log("kolumny:   ", cols.slice(cols.indexOf("warehouse_name"), cols.indexOf("warehouse_name") + 3).join(", "));
console.log("limit 50:  ", ["purchase_orders", "warehouses"].map(t => t + "=" + db.prepare("SELECT sql FROM sqlite_master WHERE name = ?").get(t).sql.includes("BETWEEN 1 AND 50")).join(", "));
console.log("integralnosc:", db.pragma("integrity_check", { simple: true }), "/ FK:", db.pragma("foreign_key_check").length);
'
```

Oczekiwany wynik:

- `zamowienia` i `historia` mają **te same liczby** co w kroku 4.4,
- `migracje` pokazuje `1,2,3,4,5,6`,
- `kolumny` pokazuje `warehouse_name, shipping_line, has_eur1_certificate`,
- `limit 50` pokazuje `purchase_orders=true, warehouses=true`,
- `integralnosc` pokazuje `ok / FK: 0`.

_Starsza wersja:_ `migracje` zmienia się z `1,2,3` na `1,2,3,4,5,6`, a liczby zamówień i historii pozostają te same.

**8.2. Aplikacja w przeglądarce** (`https://<ADRES_DEMO>`):

1. Zaloguj się. Kafelki na **Dashboardzie** pokazują te same liczby co przed wdrożeniem.
2. Na liście **Zamówień** zamiast kolumny „Wartość” jest kolumna „Cena za kg”, z ceną portową i walutą, a zamiast kolumny „Dodał” — kolumna „Magazyn”.
3. Otwórz **Nowe zamówienie** (bez zapisywania). Formularz wygląda tak jak przed wdrożeniem i **nie ma** pola „Armator”.
4. **Test zapisu (obowiązkowy):** otwórz edycję dowolnego zamówienia. Obok pola „Magazyn” jest puste pole „Armator” z licznikiem `0/50`. Wpisz np. `TEST` i zapisz.
5. Ponownie otwórz edycję tego zamówienia. Pole „Armator” pokazuje `TEST`, a w historii zmian jest wpis „Armator: — → TEST”.
6. Jeśli to nie jest zamówienie testowe, wyczyść pole „Armator” i zapisz, żeby przywrócić poprzedni stan. W historii pojawi się wpis „Armator: TEST → —”.
7. W polu „Magazyn” (formularz edycji) i w słowniku „Magazyny” na stronie **Ustawienia** nie da się wpisać więcej niż 50 znaków.

Wdrożenie jest zakończone dopiero po udanym teście zapisu (punkty 4–5), a nie po samym wyświetleniu strony.

## 9. Wycofanie zmian (rollback)

Wykonaj te kroki tylko wtedy, gdy krok 7 lub 8 się nie powiedzie.

Zwykle wystarczy **powrót do poprzedniego obrazu**, a dane wprowadzone w międzyczasie zostają zachowane. Poprzednia wersja (`69b80f5`) działa poprawnie na bazie po migracjach nr 5 i 6: nie zna kolumny `shipping_line`, więc ją pomija, a nieznanych sobie migracji nie wykonuje. Wpisane wartości „Armator” zostają w bazie i znów będą widoczne po ponownym wdrożeniu nowej wersji. Jedyna różnica: w starej wersji próba zapisania nazwy magazynu dłuższej niż 50 znaków zakończy się błędem zapisu, bo baza ma już nowy limit. Nazwy skrócone przez migrację nr 6 zostają skrócone.

```bash
cd <KATALOG_COMPOSE>
docker tag mini-dm:prev mini-dm:latest
docker compose up -d mini-dm
docker compose logs --tail 50 mini-dm
```

**Bazę z kopii przywracaj** tylko wtedy, gdy sprawdzenie z kroku 8.1 pokazało inne liczby zamówień lub historii albo błąd integralności, albo gdy serwer miał _starszą wersję_ (`migracje: 1,2,3` w kroku 4.4). Dane wprowadzone po kroku 7 zostaną wtedy utracone. Przywróć bazę **razem** z obrazem:

```bash
cd <KATALOG_COMPOSE>
docker compose stop mini-dm

# usuń bieżące pliki -wal/-shm, żeby nie zostały po nowej wersji
sudo rm -f <KATALOG_DANYCH>/mini-dm.db-wal <KATALOG_DANYCH>/mini-dm.db-shm
sudo cp -a <KATALOG_KOPII>/mini-dm-<STAMP>/mini-dm.db* <KATALOG_DANYCH>/
sudo chmod 666 <KATALOG_DANYCH>/mini-dm.db*

docker tag mini-dm:prev mini-dm:latest
docker compose up -d mini-dm
docker compose logs --tail 50 mini-dm
```

Po rollbacku powtórz sprawdzenie z kroku 4.4 na obrazie `mini-dm:latest`. Liczby i lista migracji powinny być takie same jak przed wdrożeniem.

## 10. Po udanym wdrożeniu

- Zostaw kopię z kroku 4.3 i obraz `mini-dm:prev` przez kilka dni. Gdy klient potwierdzi, że wszystko działa, możesz usunąć obraz poleceniem `docker image rm mini-dm:prev`.
- Usuń paczkę `mini-dm-a743b3c.zip` z serwera.
