# mini-DM – MVP

## Kontekst biznesowy

W firmie kilka osób z różnych działów wspólnie planuje zakupy towarów, głównie owoców przeznaczonych do dalszego przetwarzania produkcyjnego.
Obecnie proces ten jest prowadzony w jednym pliku Excel, który zawiera tabelę z planowanymi zakupami.
Tabela służy do gromadzenia informacji o towarach, które mogą zostać zakupione i dostarczone w najbliższym czasie. Dane te są potrzebne do:

* oszacowania wartości planowanych zakupów w zadanym okresie,
* zabezpieczenia środków finansowych, na przykład na kolejny tydzień,
* określenia, jakie towary i w jakich ilościach mogą zostać dostarczone,
* zaplanowania pracy różnych parków maszynowych odpowiedzialnych za przetwarzanie surowca,
* monitorowania statusu zakupów, dostaw, badań laboratoryjnych i dokumentów.

Planowane zakupy dotyczą rynku międzynarodowego, dlatego przy każdym wpisie mogą występować dodatkowe informacje logistyczne i formalne, takie jak terminy dostawy, dostawca, kraj pochodzenia, certyfikaty, numery kontenerów, status dostawy, wyniki badań laboratoryjnych czy terminy płatności.
Tych informacji nie da się wygodnie i kompletnie prowadzić w standardowym programie handlowym lub księgowym, ponieważ wiele danych ma charakter planistyczny, logistyczny lub operacyjny, a nie stricte handlowo-księgowy.
Towar nie jest zamawiany na zasadzie przedpłaty.
Dokument zakupu z terminem płatności pojawia się dopiero po zakończeniu dostawy oraz po przebadaniu towaru przez laboratorium.

---

## Obecny sposób pracy

Obecnie użytkownicy pracują na jednym pliku Excel udostępnionym przez OneDrive jako link. Dzięki temu kilka osób może jednocześnie wprowadzać, edytować i przeglądać dane.
Plik Excel działa w firmie od ponad roku. Zawiera jedną główną tabelę, której układ oraz nazwy kolumn zostały już przemyślane i wynikają z rzeczywistych potrzeb użytkowników.
Obecny plik jest więc dobrym punktem wyjścia do zaprojektowania struktury danych aplikacji.

---

## Główny problem
Excel spełnił swoją rolę jako szybkie i elastyczne narzędzie do rozpoczęcia procesu, ale obecnie stał się niewystarczający jako narzędzie do wieloosobowej pracy operacyjnej.
Główny problem polega na tym, że kilka osób jednocześnie pracuje na tej samej tabeli, a Excel nie zapewnia wystarczającej kontroli nad strukturą danych, sposobem edycji, uprawnieniami i bezpieczeństwem wpisów.

Najczęstsze problemy to:

* przypadkowe przeformatowanie tabeli przez użytkownika,
* przypadkowe ukrywanie kolumn lub zmiana widoku,
* stosowanie prywatnych filtrów, które utrudniają pracę innym osobom,
* ryzyko przypadkowego usunięcia danych,
* brak kontroli nad formatem wpisywanych wartości,
* wpisywanie dat w różnych formatach,
* mieszanie walut, na przykład EUR i USD w jednej kolumnie,
* wpisywanie różnych wariantów tej samej wartości tekstowej,
* brak jednolitego formularza do wprowadzania danych,
* brak kontroli uprawnień użytkowników,
* brak prostego raportowania według okresu, waluty, dostawcy lub statusu.

W praktyce problem nie polega na tym, że użytkownicy potrzebują zaawansowanego systemu ERP.
Problem polega na tym, że obecny plik Excel stał się krytycznym narzędziem operacyjnym, ale nie zapewnia stabilności, kontroli i bezpieczeństwa wymaganych przy codziennej pracy kilku osób.

---

## Potrzeba biznesowa

Potrzebna jest prosta aplikacja webowa typu CRUD, która zastąpi obecny plik Excel w zakresie codziennego prowadzenia planowanych zakupów.
Aplikacja powinna pracować na jednej głównej tabeli danych, odpowiadającej obecnej tabeli w Excelu. Dodatkowo może posiadać małe tabele pomocnicze, służące do definiowania wartości słownikowych, na przykład dostawców, statusów, walut, typów towarów lub innych pól wybieranych z list rozwijalnych.
Celem aplikacji nie jest budowa dużego systemu handlowego, magazynowego ani księgowego. Celem jest uporządkowanie istniejącego procesu, ograniczenie błędów użytkowników i zapewnienie bezpiecznej pracy wieloosobowej na danych, które obecnie są prowadzone w Excelu.

---

## Cel MVP

Celem MVP jest stworzenie prostej lokalnej aplikacji webowej, która umożliwi użytkownikom:

* ręczne dodawanie planowanych zakupów,
* przeglądanie istniejących wpisów,
* edycję wpisów,
* usuwanie wpisów przez uprawnione osoby,
* filtrowanie i wyszukiwanie danych,
* korzystanie z formularzy zamiast bezpośredniej edycji komórek,
* używanie list rozwijalnych dla wybranych pól,
* generowanie podstawowego raportu wartości planowanych zakupów w zadanym okresie.

Aplikacja ma przede wszystkim zastąpić jeden współdzielony plik Excel bez nadmiernego rozszerzania zakresu projektu.

---

## Najmniejszy zestaw funkcjonalności MVP

1. Aplikacja webowa uruchamiana wewnątrz firmy na lokalnym serwerze.
2. Lokalna baza danych zawierająca jedną główną tabelę planowanych zakupów.
3. Formularz dodawania nowego wpisu planowanego zakupu.
4. Formularz edycji istniejącego wpisu.
5. Widok tabelaryczny umożliwiający przeglądanie danych.
6. Możliwość usuwania wpisów przez użytkownika z odpowiednimi uprawnieniami.
7. Prosty system lokalnych kont użytkowników:
   * Administrator,
   * Użytkownik.
8. Podstawowe uprawnienia:
   * Administrator może zarządzać użytkownikami i usuwać wpisy,
   * Użytkownik może dodawać i edytować wpisy,
   * zakres szczegółowych uprawnień może zostać doprecyzowany później.
9. Pola formularza powinny walidować podstawowe typy danych:
   * daty jako daty,
   * kwoty jako liczby,
   * waluty jako osobne pole wyboru,
   * statusy jako lista rozwijalna,
   * wybrane wartości słownikowe jako listy rozwijalne.
10. Raport planowanych zakupów w zadanym okresie, pokazujący co najmniej:
    * listę wpisów z danego zakresu dat,
    * sumę wartości zamówień w EUR,
    * sumę wartości zamówień w USD.

---

## Co nie wchodzi w zakres MVP

W pierwszej wersji aplikacji nie są wymagane:

* importowanie dokumentów do bazy, takich jak PDF, DOCX, XLSX,
* automatyczny import danych z obecnego pliku Excel,
* integracje z programami handlowymi, księgowymi, magazynowymi lub ERP,
* integracje z zewnętrznymi systemami przez API,
* aplikacja mobilna,
* zaawansowany workflow akceptacji zakupów,
* automatyczne generowanie zamówień,
* obsługa skanów dokumentów,
* elektroniczny obieg dokumentów,
* zaawansowana analityka BI,
* powiadomienia e-mail,

---

## Założenia projektowe

Obecny plik Excel jest źródłem wiedzy o tym, jakie dane są potrzebne użytkownikom.
Układ kolumn z Excela powinien zostać przeanalizowany i przekształcony w strukturę bazy danych oraz formularzy aplikacji.
Aplikacja powinna być prosta, czytelna i odporna na przypadkowe błędy użytkownika.
Najważniejsze jest zapewnienie stabilnego sposobu wprowadzania i przeglądania danych, a nie budowa rozbudowanego systemu.
Interfejs powinien przypominać użytkownikom znany układ tabeli, ale edycja danych powinna odbywać się przez formularze, aby ograniczyć przypadkowe uszkodzenie struktury danych.

---

## Kryteria sukcesu MVP

MVP można uznać za udane, jeżeli:

* użytkownicy mogą zrezygnować z codziennej pracy na współdzielonym pliku Excel,
* dane są wprowadzane przez formularz, a nie przez swobodną edycję komórek,
* aplikacja ogranicza możliwość wpisywania błędnych formatów dat, kwot i walut,
* użytkownicy mogą jednocześnie pracować na tych samych danych bez psucia widoku innym osobom,
* przypadkowe ukrycie kolumn, zmiana filtrów lub przeformatowanie tabeli nie wpływa na dane innych użytkowników,
* administrator ma kontrolę nad użytkownikami i uprawnieniami,
* można wygenerować prosty raport planowanych zakupów dla wybranego okresu,
* raport pokazuje sumy wartości zakupów osobno dla EUR i USD,
* aplikacja działa lokalnie w firmowej infrastrukturze,
* zakres aplikacji pozostaje prosty i skoncentrowany na zastąpieniu jednej głównej tabeli Excel.

---

## Definicja problemu w jednym zdaniu

Firma potrzebuje prostej lokalnej aplikacji webowej typu CRUD, która zastąpi współdzielony plik Excel używany do planowania zakupów surowców, zapewniając bezpieczną pracę wielu użytkowników, kontrolę poprawności danych, formularze edycji oraz podstawowe raportowanie wartości planowanych zakupów.
