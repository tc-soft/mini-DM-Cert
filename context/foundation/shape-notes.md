---
project: "mini-DM"
context_type: greenfield
created: 2026-07-09
updated: 2026-07-10
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: "kategoria bólu"
      decision: "tarcie wieloosobowe + brak kontroli jakości danych + brak uprawnień + brak raportowania"
    - topic: "wgląd"
      decision: "to nie jest ERP, tylko uporządkowany Excel — zakupy planistyczne nie pasują do handlowo-księgowych, a nie potrzebują pełnego ERP"
    - topic: "zakres głównej persony"
      decision: "pracownicy działów zaangażowanych w planowanie zakupów (zakupy, produkcja, finanse)"
    - topic: "uwierzytelnianie"
      decision: "lokalne konta login+hasło, bez OAuth"
    - topic: "role"
      decision: "dwie role: Administrator (zarządza użytkownikami, usuwa wpisy), Użytkownik (dodaje/edytuje wpisy)"
    - topic: "przepływ MVP"
      decision: "logowanie → formularz dodania wpisu → widok tabelaryczny → filtrowanie → raport walutowy; 6 kroków, ~3 tygodnie po godzinach, zaakceptowane bez zmian zakresu"
    - topic: "logika biznesowa"
      decision: "flagowanie wpisów wymagających uwagi (termin bez potwierdzonego statusu / brak badań lab po dostawie / ręczna flaga) + walidacja spójności (data dostawy vs zamówienia, dokładnie jedna waluta)"
    - topic: "skala i ramowanie produktu"
      decision: "web-app, dziesiątki do stu użytkowników, bez twardego terminu, praca po godzinach; reguła flagowania niezależna od skali"
    - topic: "waluty w raporcie"
      decision: "lista walut otwarta (zarządzana przez Administratora, FR-011), raport sumuje osobno każdą użytą walutę — nie tylko EUR/USD"
    - topic: "powiadomienia e-mail"
      decision: "nie budowane w MVP (non-goal), ale odnotowane jako przyszła rozbudowa w Forward: technical-roadmap"
  frs_drafted: 12
  quality_check_status: accepted
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

# Shape Notes

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
- FR-010: Użytkownik może zobaczyć historię zmian wpisu (kto i kiedy edytował). Priorytet: miły dodatek
  > Sokrates: Rozważono kontrargument: "to nice-to-have — może lepiej usunąć całkowicie zamiast trzymać jako cel drugorzędny?" Rozwiązanie: zachowano jako miły dodatek; przydatne przy pracy wieloosobowej, ale nie krytyczne dla MVP.
- FR-011: Administrator może dodawać i edytować wartości słownikowe (dostawcy, statusy, waluty, typy towarów) używane w listach rozwijalnych. Priorytet: musi być
- FR-012: Użytkownik może ręcznie oznaczyć wpis jako wymagający uwagi/ważny. Priorytet: musi być

### Raportowanie
- FR-009: Użytkownik może wygenerować raport planowanych zakupów dla zadanego zakresu dat, pokazujący listę wpisów oraz osobną sumę wartości dla każdej waluty występującej we wpisach (nie tylko EUR/USD). Priorytet: musi być
  > Sokrates: Rozważono kontrargument: "czy podział tylko na EUR/USD wystarczy, skoro w przyszłości mogą pojawić się inne waluty?" Rozwiązanie zaktualizowane w Fazie 6: lista walut jest otwarta i zarządzana przez Administratora (FR-011); raport sumuje osobno każdą walutę użytą we wpisach, a nie tylko EUR i USD.

## Non-Functional Requirements

- Zmiana filtrów, sortowania lub formatowania widoku przez jednego użytkownika nie wpływa na widok innych użytkowników pracujących na tych samych danych w tym samym czasie.
- Aplikacja jest dostępna wyłącznie z sieci wewnętrznej firmy — brak dostępu z internetu publicznego.
- Typowe operacje (zapis wpisu, wczytanie widoku tabelarycznego) dają użytkownikowi odpowiedź bez zauważalnego opóźnienia przy normalnej liczbie wpisów i jednocześnie pracujących użytkowników.

## Business Logic

Aplikacja automatycznie oznacza wpis planowanego zakupu jako „wymagający uwagi”, gdy zbliża się termin dostawy bez potwierdzonego statusu, gdy dostawa została zakończona bez wprowadzonych wyników badań laboratoryjnych, lub gdy użytkownik ręcznie oznaczy wpis jako ważny.

Reguła konsumuje dane wprowadzone przez użytkownika w formularzu wpisu: termin dostawy, status, informację o wynikach badań laboratoryjnych oraz opcjonalną ręczną flagę ważności. Jej wynikiem jest wizualne oznaczenie wpisu w widoku tabelarycznym, dzięki któremu użytkownik od razu widzi, które zakupy wymagają interwencji, bez przeszukiwania całej tabeli. Użytkownik napotyka tę regułę codziennie podczas przeglądania widoku tabelarycznego oraz podczas generowania raportu.

Dodatkowo, przy zapisie każdego wpisu aplikacja odrzuca dane niespójne: termin dostawy nie może być wcześniejszy niż data złożenia zamówienia, a kwota musi mieć przypisaną dokładnie jedną walutę z listy słownikowej, bez mieszania walut w jednym polu.

## Access Control

Lokalne konta użytkowników (login + hasło), aplikacja działa wewnątrz firmy na lokalnym serwerze. Dwie role:

- **Administrator** — zarządza kontami użytkowników, może usuwać wpisy.
- **Użytkownik** — może dodawać i edytować wpisy planowanych zakupów.

Szczegółowy zakres uprawnień w ramach tych ról może zostać doprecyzowany później.

## Non-Goals

- Import dokumentów do bazy (PDF, DOCX, XLSX) — dane wprowadzane wyłącznie ręcznie przez formularze w MVP.
- Automatyczny import danych z obecnego pliku Excel — dane wprowadzane od nowa, bez migracji automatycznej.
- Integracje z systemami ERP, księgowymi, magazynowymi lub zewnętrznym API — poza zakresem MVP, dane planistyczne pozostają w tej aplikacji.
- Aplikacja mobilna — tylko aplikacja webowa dostępna w sieci firmowej.
- Zaawansowany workflow akceptacji zakupów — brak wieloetapowego procesu zatwierdzania w MVP.
- Automatyczne generowanie zamówień — system nie tworzy ani nie wysyła zamówień automatycznie.
- Obsługa skanów dokumentów i elektroniczny obieg dokumentów — brak OCR i pełnego elektronicznego obiegu dokumentów.
- Zaawansowana analityka BI — raport ograniczony do listy wpisów i sum wartości wg waluty.
- Powiadomienia e-mail nie są budowane w MVP — decyzja świadomie zostawia miejsce na dodanie tej funkcji później (patrz `## Forward: technical-roadmap`), ale sama wysyłka nie wchodzi w zakres pierwszej wersji.

## Forward: technical-roadmap

- Powiadomienia e-mail: użytkownik chce, by architektura MVP nie utrudniała dodania powiadomień e-mail w przyszłości (np. przy oznaczeniu wpisu jako "wymagający uwagi"), nawet jeśli sama wysyłka nie jest budowana teraz. Do rozważenia przy planowaniu implementacji / wyborze stosu.
