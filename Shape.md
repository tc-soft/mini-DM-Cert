## mini-DM - MVP

### Główny problem
Problem został zgłoszony przez użytkowników, którzy muszą wspólnie (kilka osób) wypełniać tabelę w Excel-u w której umieszczane są planowane zakupy towarów (głównie owoców do dalszego przetwarzania w firmie).
Tabela taka pomaga oszacować wartość kupowanych produktów w zadanym okresie w celu zabezpieczenia funduszy np. na koleny tydzień oraz wiedzy ile czego może być dostarczona aby zabezpieczyć różne parki maszyn do ich przetwarzania.
Wpisywanie planowanych zakupów dotyczy runku międzynarodowego, gdzie występują różne etapy i problemy logistyczne jak np. termin dostawy, certyfikaty, statusy itp.
Tych informacji nie można umieścić w programach handlowych, gdzie wiele z nich nie jest tam zawarta.
Zamawiany towar migdy nie jest na przedpłatę.
Dokument zakupu z terminem płatności jest dostarczany po zakończeniu dostawy i przebadaniu towaru przez Laboratorium.

Taki plik Excel posiadający jedną tabelę został udostępniony użytkownikom przez OneDrive jako link aby kilka osób z różnych działów mogła jednocześnie dokonywać wpisów/zmian.
Ten plik Excel pracuje w firmie ponad rok i ma przemyślane nazwy kolumn w tabeli.

Wiemy, że Excel to nie jest baza danych.
Problemem jest to, jak kilka osób jednocześnie pracuje na tej samej tabeli, gdzie są częste problemy związane z naciśnięciem kombinacji klawiszy i przypadkowym przeformatowaniem widoku tabeli.
Użytkownicy czasami definiują swoje filtry, niektórzy ukrywają część kolumn co jest problemem w pracy zespołowej.
Jest duże ryzyko przypadkowego skasowania danych.
Brak estetyki wprowadzania danych, gdzie w każde pole można wpisywać różne wartości, a użytkownicy np. wpisują różnie daty lub kwoty EUR i USD w tej samej kolumnie.

Potrzebna jest prosta aplikacji typu CRUD pracująca na jednej tabeli.
Aplikacja może posiadać w bazie dodatkowe małe tabele do definicji pól rozwijalnych ze stałymi wartościami co ułatwi wprowadzanie/edycji danych na formularzu.

### Najmniejszy zestaw funkcjonalności
- Aplikacja typu WEB która musi pracować wewnątrz firmy na lokalnych serwerach
- Aplikacja musi zapewnić manualne wprowadzanie planowanych zakupów za pomocą formularza
- Aplikacja musi zapewnić przeglądanie, edycja i usuwanie wpisów
- Aplikacja musi zapewnić prosty system lokalnych kont użytkowników (Administratorzy, Użytkownicy)
- Aplikacja musi posiadać raport planowanych zakupów w zadanym okresie z sumą wartości zamówień w EUR i USD

### Co NIE wchodzi w zakres MVP
- Import jakichkolwiek dokumentów do bazy (PDF, DOCX, itp.)
- Integracje z innymi systemamu poprzez API
- Aplikacje mobilne (na początek tylko web)

### Kryteria sukcesu




