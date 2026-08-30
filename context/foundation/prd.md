---
project: "mini-DM"
version: 1
status: draft
created: 2026-07-10
context_type: greenfield
product_type: web-app
target_scale:
  users: medium
  qps: null
  data_volume: null
timeline_budget:
  mvp_weeks: 3
  hard_deadline: null
  after_hours_only: true
---

# PRD: mini-DM

## Vision & Problem Statement

Pracownicy kilku działów firmy (m.in. zakupów, produkcji, finansów) wspólnie planują zakupy towarów — głównie owoców do przetwarzania produkcyjnego — na współdzielonym pliku Excel udostępnionym przez OneDrive. Codzienna, jednoczesna praca wielu osób na tej samej tabeli prowadzi do przypadkowego przeformatowania, ukrywania kolumn, stosowania prywatnych filtrów psujących widok innym, ryzyka przypadkowego usunięcia danych, braku kontroli nad formatem dat/kwot/walut (mieszanie EUR i USD w jednej kolumnie), niespójnych wariantów tej samej wartości tekstowej, braku uprawnień użytkowników oraz braku prostego raportowania wartości zakupów wg okresu, waluty, dostawcy lub statusu.

Potrzebne dane mają charakter planistyczny, logistyczny i operacyjny (terminy dostaw, dostawca, kraj pochodzenia, certyfikaty, numery kontenerów, status dostawy, wyniki badań laboratoryjnych, terminy płatności) — nie pasują wygodnie do standardowych programów handlowo-księgowych, a jednocześnie nie wymagają pełnego systemu ERP. Dokument zakupu z terminem płatności pojawia się dopiero po zakończeniu dostawy i przebadaniu towaru przez laboratorium, więc przez większość cyklu życia zakupu dane istnieją wyłącznie w warstwie planistycznej — stąd luka, której nie wypełnia ani Excel (za mało kontroli), ani ERP (za dużo narzutu dla samego planowania).

## User & Persona

Główna persona: pracownik działu zaangażowanego w planowanie zakupów (np. zakupy, produkcja, finanse) w firmie przetwarzającej owoce. Sięga po aplikację codziennie, gdy: dodaje nowy planowany zakup, aktualizuje status dostawy / badania laboratoryjnego / dokumentu, albo sprawdza, ile środków finansowych trzeba zabezpieczyć na najbliższy okres (np. tydzień). Dziś robi to na współdzielonym pliku Excel, walcząc z przypadkowymi zmianami wprowadzanymi przez innych użytkowników tej samej tabeli.

## Success Criteria

### Primary

- Użytkownik może zalogować się, dodać nowy planowany zakup przez formularz, zobaczyć go w widoku tabelarycznym oraz wygenerować raport dla zadanego zakresu dat pokazujący listę wpisów i osobną sumę wartości dla każdej waluty występującej we wpisach.

### Secondary

- Historia zmian wpisu (kto i kiedy edytował dany wpis).

### Guardrails

- Wielu użytkowników może jednocześnie pracować na danych bez psucia widoku innym (przypadkowe ukrycie kolumn, zmiana filtrów, przeformatowanie przez jednego użytkownika nie wpływa na innych).
- Walidacja formatu danych (daty, kwoty, waluty) jest zawsze wymuszona przez formularz — nie da się wpisać dowolnego tekstu w te pola.
- Żadne dane nie znikają przypadkowo — usuwanie wpisów jest ograniczone do roli Administratora.

## User Stories

### US-01: Użytkownik dodaje planowany zakup i generuje raport

- **Given** zalogowany użytkownik z rolą Użytkownik lub Administrator
- **When** wypełnia formularz nowego planowanego zakupu (towar, ilość, dostawca, termin dostawy, kwota, waluta, status) i zapisuje go
- **Then** wpis pojawia się w widoku tabelarycznym widocznym dla wszystkich użytkowników, a przy generowaniu raportu dla zakresu dat obejmującego ten wpis raport pokazuje go na liście oraz uwzględnia jego wartość w sumie dla jego waluty

#### Acceptance Criteria

- Pola daty, kwoty i waluty są walidowane przez formularz — nie da się zapisać nieprawidłowego formatu
- Inny zalogowany użytkownik widzi nowy wpis w swoim widoku tabelarycznym bez odświeżania całej aplikacji od zera
- Raport sumuje wartości osobno dla każdej waluty występującej we wpisach — bez mieszania walut w jednej sumie

## Functional Requirements

### Uwierzytelnianie i uprawnienia

- FR-001: Użytkownik może zalogować się do aplikacji za pomocą konta lokalnego. Priorytet: musi być
  > Sokrates: Rozważono kontrargument: "lokalne konta wymagają ręcznego zarządzania hasłami/resetami — czy to nie za duży narzut dla małej grupy?" Rozwiązanie: zachowano bez zmian; narzut akceptowalny, bo grupa użytkowników jest mała i stała.
- FR-006: Administrator może usuwać wpisy. Priorytet: musi być
  > Sokrates: Rozważono kontrargument: "zwykły Użytkownik nie może sam usunąć własnego błędnego wpisu — czy to nie za duże tarcie?" Rozwiązanie: zachowano bez zmian; to świadomy guardrail przed przypadkową utratą danych, ustalony już w Fazie 3.
- FR-007: Administrator może zarządzać kontami użytkowników. Priorytet: musi być
  > Sokrates: Rozważono kontrargument: "grupa jest mała i stała — może wystarczyłoby zarządzanie kontami bezpośrednio w bazie?" Rozwiązanie: zachowano bez zmian; bez UI do zarządzania kontami administrator musiałby ręcznie manipulować bazą przy każdej zmianie kadrowej.

### Zarządzanie wpisami planowanych zakupów

- FR-002: Użytkownik może dodać nowy wpis planowanego zakupu przez formularz. Priorytet: musi być
  > Sokrates: Rozważono kontrargument: "formularz jest wolniejszy niż wklejenie wiersza w Excelu — czy to nie spowolni pracy?" Rozwiązanie: zachowano bez zmian; spowolnienie akceptowalne w zamian za kontrolę nad jakością danych.
- FR-003: Użytkownik może edytować istniejący wpis przez formularz. Priorytet: musi być
  > Sokrates: Rozważono kontrargument: "formularz utrudnia szybkie poprawki drobnych błędów w porównaniu do edycji komórki." Rozwiązanie: zachowano bez zmian; kontrola nad formatem ważniejsza niż szybkość drobnej poprawki.
- FR-004: Użytkownik może przeglądać wpisy w widoku tabelarycznym. Priorytet: musi być
  > Sokrates: Rozważono kontrargument: "brak bezpośredniej edycji komórek może frustrować użytkowników przyzwyczajonych do Excela." Rozwiązanie: zachowano bez zmian; to świadomy kompromis z założeń projektowych (idea-notes.md: edycja przez formularze, nie komórki).
- FR-005: Użytkownik może filtrować i wyszukiwać wpisy; filtry i wyszukiwanie są domyślne i współdzielone dla wszystkich użytkowników — aplikacja nie zapamiętuje osobistych, prywatnych filtrów per użytkownik. Priorytet: musi być
  > Sokrates: Rozważono kontrargument: "prywatne filtry wprowadzą z powrotem problem psucia widoku innym, tak jak w Excelu." Rozwiązanie: doprecyzowano FR — filtry są domyślne/wspólne, nie osobiste, żeby uniknąć powtórzenia problemu z Excela.
- FR-008: Użytkownik wybiera wartości słownikowe (dostawca, status, waluta itd.) z list rozwijalnych zamiast wpisywać dowolny tekst. Priorytet: musi być
  > Sokrates: Rozważono kontrargument: "co jeśli potrzebna wartość (np. nowy dostawca) nie istnieje jeszcze na liście — czy to nie zablokuje pracy?" Rozwiązanie: dodano FR-011, żeby Administrator mógł rozszerzać listy słownikowe bez blokowania pracy.
  > Świadome odstępstwo (2026-08-29): `waluta` jest ścisłym select-em walidowanym przy zapisie względem słownika (patrz `currencies`). `dostawca` i `towar` są polami tekstowymi z podpowiedziami (`<datalist>`), nie ścisłym select-em — nowa wartość jest automatycznie dodawana do słownika przy użyciu, żeby nie blokować pracy przy pierwszym wystąpieniu nowego dostawcy/towaru. Zaakceptowane jako celowy kompromis, nie planowana zmiana na ścisły select.
- FR-010: Użytkownik może zobaczyć historię zmian wpisu (kto i kiedy edytował). Priorytet: miły dodatek
  > Sokrates: Rozważono kontrargument: "to nice-to-have — może lepiej usunąć całkowicie zamiast trzymać jako cel drugorzędny?" Rozwiązanie: zachowano jako miły dodatek; przydatne przy pracy wieloosobowej, ale nie krytyczne dla MVP.
- FR-011: Użytkownik może dodawać, edytować i usuwać wartości słownikowe (dostawcy, statusy, waluty, typy towarów) używane w listach rozwijalnych. Priorytet: musi być
  > Decyzja (2026-08-30): pierwotnie zarezerwowane dla Administratora; przy doprecyzowywaniu podziału uprawnień (patrz Open Questions) użytkownik zdecydował otworzyć zarządzanie słownikami dla wszystkich zalogowanych — zarządzanie kontami użytkowników (FR-007) i usuwanie wpisów zamówień (FR-006) pozostają zarezerwowane wyłącznie dla Administratora.
- FR-012: Użytkownik może ręcznie oznaczyć wpis jako wymagający uwagi/ważny. Priorytet: musi być

### Raportowanie

- FR-009: Użytkownik może wygenerować raport planowanych zakupów dla zadanego zakresu dat, pokazujący listę wpisów oraz osobną sumę wartości dla każdej waluty występującej we wpisach (nie tylko EUR/USD). Priorytet: musi być
  > Sokrates: Rozważono kontrargument: "czy podział tylko na EUR/USD wystarczy, skoro w przyszłości mogą pojawić się inne waluty?" Rozwiązanie zaktualizowane w Fazie 6: lista walut jest otwarta i zarządzana zgodnie z FR-011; raport sumuje osobno każdą walutę użytą we wpisach, a nie tylko EUR i USD.

## Pokrycie testami

Testy automatyczne dodane 2026-08-30 (Vitest — `tests/lib/`, Playwright E2E — `e2e/`; patrz `CLAUDE.md` sekcja Testing). Pokrycie per FR:

| FR                                     | Pokrycie                                                                                                                                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-001 (logowanie)                     | E2E `auth.spec.ts` (poprawne i błędne dane logowania) + Vitest `auth.test.ts` (`signIn`/`getSessionUser`/`signOut`)                                                                                                            |
| FR-002 (dodanie wpisu)                 | E2E `orders.spec.ts` (tworzenie przez formularz) + Vitest `orders-form.test.ts`, `orders.test.ts` (`createOrder`)                                                                                                              |
| FR-003 (edycja wpisu)                  | E2E `orders.spec.ts` (edycja przez formularz) + Vitest `orders.test.ts` (`updateOrder`)                                                                                                                                        |
| FR-004 (widok tabelaryczny)            | E2E `orders.spec.ts` (nowy wpis widoczny w tabeli po zapisie)                                                                                                                                                                  |
| FR-005 (filtrowanie/wyszukiwanie)      | Vitest `orders.test.ts` (filtry `q`, `onlyBlocked`, `onlyOverduePayment`) + E2E `orders.spec.ts` (wyszukiwanie zawęża tabelę)                                                                                                  |
| FR-006 (usuwanie przez Administratora) | Vitest `orders.test.ts` (`deleteOrder`); E2E tylko negatywnie — `permissions.spec.ts` sprawdza brak przycisku „Usuń” dla zwykłego użytkownika. **Brak E2E na pozytywną ścieżkę usuwania przez admina.**                        |
| FR-007 (zarządzanie kontami)           | Vitest `users.test.ts` (`createUser`/`updateUserRole`/`deleteUser`/`resetPassword`, guardrail ostatniego admina) + E2E częściowo — `permissions.spec.ts` tworzy konto, nie testuje zmiany roli/resetu hasła/usunięcia przez UI |
| FR-008 (wartości słownikowe z list)    | Vitest `orders-form.test.ts` (walidacja waluty względem słownika), `dictionaries.test.ts` (CRUD słowników)                                                                                                                     |
| FR-009 (raport per waluta)             | Vitest `orders.test.ts` (`sumOrderValueByCurrency`, `listOrdersForReport`) + E2E `reports.spec.ts` (pełny przepływ przez UI)                                                                                                   |
| FR-010 (historia zmian)                | Vitest `orders.test.ts` (diffing historii — tylko zmienione pola) + E2E `orders.spec.ts` (wpis w historii widoczny w UI)                                                                                                       |
| FR-011 (zarządzanie słownikami)        | Vitest `dictionaries.test.ts` (CRUD) + E2E `permissions.spec.ts` (dostęp zwykłego użytkownika do `/admin/dictionaries`)                                                                                                        |
| FR-012 (ręczna flaga „wymaga uwagi”)   | Vitest `orders.test.ts` (wyprowadzenie `needs_attention`, w tym ręczne oznaczenie). **Brak E2E.**                                                                                                                              |

**Znane luki:** FR-006 i FR-012 nie mają testu E2E na pozytywną ścieżkę (odpowiednio: admin faktycznie usuwa wpis; użytkownik zaznacza checkbox „ważne” i widzi flagę w tabeli/raporcie). FR-007 ma tylko częściowe pokrycie E2E (samo tworzenie konta). Logika biznesowa dla wszystkich trzech jest pokryta na poziomie Vitest.

## Non-Functional Requirements

- Zmiana filtrów, sortowania lub formatowania widoku przez jednego użytkownika nie wpływa na widok innych użytkowników pracujących na tych samych danych w tym samym czasie.
- Aplikacja jest dostępna wyłącznie z sieci wewnętrznej firmy — brak dostępu z internetu publicznego.
- Typowe operacje (zapis wpisu, wczytanie widoku tabelarycznego) dają użytkownikowi odpowiedź bez zauważalnego opóźnienia przy normalnej liczbie wpisów i jednocześnie pracujących użytkowników.

## Business Logic

Aplikacja automatycznie oznacza wpis planowanego zakupu jako „wymagający uwagi”, gdy zbliża się termin dostawy bez potwierdzonego statusu, gdy dostawa została zakończona bez wprowadzonych wyników badań laboratoryjnych, lub gdy użytkownik ręcznie oznaczy wpis jako ważny.

Reguła konsumuje dane wprowadzone przez użytkownika w formularzu wpisu: termin dostawy, status, informację o wynikach badań laboratoryjnych oraz opcjonalną ręczną flagę ważności. Jej wynikiem jest wizualne oznaczenie wpisu w widoku tabelarycznym, dzięki któremu użytkownik od razu widzi, które zakupy wymagają interwencji, bez przeszukiwania całej tabeli. Użytkownik napotyka tę regułę codziennie podczas przeglądania widoku tabelarycznego oraz podczas generowania raportu.

Dodatkowo, przy zapisie każdego wpisu aplikacja odrzuca dane niespójne: kwota musi mieć przypisaną dokładnie jedną walutę z listy słownikowej, bez mieszania walut w jednym polu. (Reguła "termin dostawy nie wcześniejszy niż data złożenia zamówienia" została świadomie pominięta — schemat przechowuje tylko systemowy znacznik utworzenia rekordu, nie osobną biznesową datę złożenia zamówienia, więc taka walidacja uniemożliwiałaby uzupełnianie zaległych wpisów historycznych.)

## Access Control

Lokalne konta użytkowników (login + hasło), aplikacja działa wewnątrz firmy na lokalnym serwerze. Dwie role:

- **Administrator** — ma dostęp do wszystkiego, w tym wyłącznie on zarządza kontami użytkowników (FR-007) i może usuwać wpisy (FR-006).
- **Użytkownik** — może dodawać i edytować wpisy planowanych zakupów oraz zarządzać wartościami słownikowymi (FR-011); nie ma dostępu do zarządzania kontami użytkowników i nie może usuwać wpisów.

## Non-Goals

- Import dokumentów do bazy (PDF, DOCX, XLSX) — dane wprowadzane wyłącznie ręcznie przez formularze w MVP.
- Automatyczny import danych z obecnego pliku Excel — dane wprowadzane od nowa, bez migracji automatycznej.
- Integracje z systemami ERP, księgowymi, magazynowymi lub zewnętrznym API — poza zakresem MVP, dane planistyczne pozostają w tej aplikacji.
- Aplikacja mobilna — tylko aplikacja webowa dostępna w sieci firmowej.
- Zaawansowany workflow akceptacji zakupów — brak wieloetapowego procesu zatwierdzania w MVP.
- Automatyczne generowanie zamówień — system nie tworzy ani nie wysyła zamówień automatycznie.
- Obsługa skanów dokumentów i elektroniczny obieg dokumentów — brak OCR i pełnego elektronicznego obiegu dokumentów.
- Zaawansowana analityka BI — raport ograniczony do listy wpisów i sum wartości wg waluty.
- Powiadomienia e-mail nie są budowane w MVP — decyzja świadomie zostawia miejsce na dodanie tej funkcji później, ale sama wysyłka nie wchodzi w zakres pierwszej wersji.

## Open Questions

Brak otwartych pytań. Jedyne pytanie (dokładny podział uprawnień Administrator/Użytkownik) rozstrzygnięto 2026-08-30 — patrz FR-011 i sekcja Access Control.
