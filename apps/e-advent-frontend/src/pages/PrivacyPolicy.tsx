import FestivePage from '../components/FestivePage';
import ContentCard from '../components/ContentCard';

export default function PrivacyPolicy() {
  return (
    <FestivePage>
      <ContentCard padding="lg">
        <h1 className="heading-page mb-8">Polityka prywatności</h1>

        <div className="prose-legal space-y-6">
            <section>
              <h2 className="legal-h2">1. Informacje ogólne</h2>
              <p className="mb-4">
                Niniejsza polityka prywatności opisuje zasady przetwarzania danych osobowych 
                w serwisie internetowym e-Advent dostępnym pod adresem e-advent.pl (dalej: "Serwis") 
                oraz zasady ochrony danych osobowych użytkowników.
              </p>
              <div className="alert-info mb-4">
                <p className="font-semibold mb-2">Administrator danych osobowych:</p>
                <p><strong>inTaz Bartosz Kuligowski</strong></p>
                <p>NIP: 7812010357</p>
                <p>Siedziba: Rokietnica</p>
                <p>Email: kontakt@e-advent.pl</p>
                <p className="mt-2 text-sm">
                  Administrator zgodnie z obowiązującym prawem, w szczególności z Rozporządzeniem 
                  Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. w sprawie 
                  ochrony osób fizycznych w związku z przetwarzaniem danych osobowych i w sprawie 
                  swobodnego przepływu takich danych (RODO), zobowiązuje się do ochrony prywatności 
                  użytkowników Serwisu.
                </p>
              </div>
            </section>

            <section>
              <h2 className="legal-h2">2. Podstawa prawna i cel przetwarzania danych</h2>
              <p className="mb-4">
                Dane osobowe przetwarzane są w następujących celach:
              </p>
              
              <h3 className="legal-h3">2.1. Wykonanie umowy (art. 6 ust. 1 lit. b RODO)</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Przetwarzanie danych w celu wykonania umowy o świadczenie usługi drogą elektroniczną</li>
                <li>Utworzenie i dostarczenie kalendarza adwentowego</li>
                <li>Obsługa płatności</li>
                <li>Wysyłka linku do kalendarza na adres e-mail</li>
              </ul>

              <h3 className="legal-h3">2.2. Zgoda (art. 6 ust. 1 lit. a RODO)</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Wysyłka codziennych przypomnień e-mail z zadaniami (jeśli użytkownik wyraził zgodę)</li>
                <li>Marketing bezpośredni (jeśli użytkownik wyraził zgodę)</li>
              </ul>

              <h3 className="legal-h3">2.3. Obowiązek prawny (art. 6 ust. 1 lit. c RODO)</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Przechowywanie dokumentów księgowych</li>
              </ul>

              <h3 className="legal-h3">2.4. Prawnie uzasadniony interes (art. 6 ust. 1 lit. f RODO)</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Odpowiedzi na zapytania i reklamacje</li>
                <li>Zapewnienie bezpieczeństwa Serwisu</li>
                <li>Analiza statystyczna korzystania z Serwisu</li>
              </ul>
            </section>

            <section>
              <h2 className="legal-h2">3. Zakres przetwarzanych danych osobowych</h2>
              <p className="mb-4">
                Administrator przetwarza następujące kategorie danych osobowych:
              </p>
              
              <h3 className="legal-h3">3.1. Dane identyfikacyjne</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Imię</li>
                <li>Adres e-mail</li>
              </ul>

              <h3 className="legal-h3">3.2. Dane dotyczące usługi</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Tytuł kalendarza</li>
                <li>Zadania kalendarzowe (opcjonalnie)</li>
                <li>Preferencje użytkownika (np. codzienne przypomnienia e-mail)</li>
              </ul>

              <h3 className="legal-h3">3.3. Dane techniczne</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Adres IP</li>
                <li>Informacje o przeglądarce i urządzeniu</li>
                <li>Data i czas odwiedzin</li>
                <li>Strony odwiedzone w ramach Serwisu</li>
              </ul>

              <h3 className="legal-h3">3.4. Dane dotyczące transakcji</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Informacje dotyczące płatności (przetwarzane przez operatora płatności)</li>
                <li>Data transakcji</li>
              </ul>
            </section>

            <section>
              <h2 className="legal-h2">4. Pliki cookie i technologie śledzące</h2>
              <p className="mb-4">
                Serwis wykorzystuje pliki cookie i podobne technologie w następujących celach:
              </p>
              
              <h3 className="legal-h3">4.1. Niezbędne pliki cookie</h3>
              <p className="mb-4">
                Pliki cookie niezbędne do funkcjonowania Serwisu, w tym:
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Zapamiętanie postępu w kalendarzu adwentowym (dane lokalne w przeglądarce)</li>
                <li>Zapisywanie preferencji użytkownika</li>
                <li>Utrzymanie sesji użytkownika</li>
              </ul>

              <h3 className="legal-h3">4.2. Pliki cookie analityczne</h3>
              <p className="mb-4">
                Serwis wykorzystuje Google Analytics do analizy ruchu w Serwisie. 
                Administrator wykorzystuje dane anonimowe do poprawy funkcjonalności Serwisu.
              </p>

              <h3 className="legal-h3">4.3. Zarządzanie plikami cookie</h3>
              <p className="mb-4">
                Użytkownik może w każdej chwili wyłączyć lub ograniczyć pliki cookie w ustawieniach 
                przeglądarki. Większość przeglądarek automatycznie akceptuje pliki cookie, jednak 
                użytkownik może zmienić ustawienia przeglądarki, aby je odrzucić.
              </p>
            </section>

            <section>
              <h2 className="legal-h2">5. Udostępnianie danych osobowych</h2>
              <p className="mb-4">
                Administrator może udostępniać dane osobowe następującym podmiotom:
              </p>
              
              <h3 className="legal-h3">5.1. Podmioty przetwarzające dane</h3>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>Dostawcy usług IT</strong> - w zakresie niezbędnym do utrzymania Serwisu</li>
                <li><strong>Operatorzy płatności</strong> - w celu realizacji płatności</li>
                <li><strong>Dostawcy usług e-mail</strong> - w celu wysyłki wiadomości e-mail</li>
                <li><strong>Google Analytics</strong> - w celu analizy statystycznej</li>
              </ul>

              <h3 className="legal-h3">5.2. Organy uprawnione</h3>
              <p className="mb-4">
                Administrator może udostępnić dane osobowe organom uprawnionym na podstawie 
                obowiązujących przepisów prawa, w szczególności na podstawie wezwania sądowego 
                lub innego prawomocnego żądania organu państwowego.
              </p>
            </section>

            <section>
              <h2 className="legal-h2">6. Okres przechowywania danych</h2>
              <p className="mb-4">
                Dane osobowe są przechowywane przez okres:
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>Dane dotyczące umowy</strong> - przez okres obowiązywania umowy oraz przez 
                    5 lat od zakończenia umowy (zgodnie z przepisami o rachunkowości)</li>
                <li><strong>Dane dotyczące zgód marketingowych</strong> - do momentu cofnięcia zgody</li>
                <li><strong>Dane techniczne (logi)</strong> - przez okres niezbędny do zapewnienia 
                    bezpieczeństwa Serwisu, nie dłużej niż 12 miesięcy</li>
              </ul>
            </section>

            <section>
              <h2 className="legal-h2">7. Prawa użytkownika</h2>
              <p className="mb-4">
                Użytkownik ma następujące prawa w zakresie przetwarzania danych osobowych:
              </p>
              
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>Prawo dostępu do danych</strong> (art. 15 RODO) - użytkownik może otrzymać 
                    informację o przetwarzaniu swoich danych osobowych</li>
                <li><strong>Prawo do sprostowania danych</strong> (art. 16 RODO) - użytkownik może 
                    żądać poprawienia nieprawidłowych danych</li>
                <li><strong>Prawo do usunięcia danych</strong> (art. 17 RODO) - użytkownik może żądać 
                    usunięcia danych (tzw. "prawo do bycia zapomnianym")</li>
                <li><strong>Prawo do ograniczenia przetwarzania</strong> (art. 18 RODO)</li>
                <li><strong>Prawo do przenoszenia danych</strong> (art. 20 RODO) - użytkownik może 
                    otrzymać swoje dane w ustrukturyzowanym formacie</li>
                <li><strong>Prawo do sprzeciwu</strong> (art. 21 RODO) - użytkownik może wnieść 
                    sprzeciw wobec przetwarzania danych w celach marketingowych</li>
                <li><strong>Prawo do cofnięcia zgody</strong> (art. 7 ust. 3 RODO) - w przypadku 
                    gdy przetwarzanie opiera się na zgodzie</li>
                <li><strong>Prawo do wniesienia skargi do organu nadzorczego</strong> (art. 77 RODO) - 
                    użytkownik może wnieść skargę do Prezesa Urzędu Ochrony Danych Osobowych</li>
              </ul>

              <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg mb-4">
                <p className="font-semibold mb-2">Jak skorzystać z praw?</p>
                <p className="text-sm">
                  Aby skorzystać z któregokolwiek z powyższych praw, prosimy o kontakt na adres: 
                  <strong> kontakt@e-advent.pl</strong>. Odpowiemy na Twoje żądanie w ciągu 30 dni.
                </p>
              </div>
            </section>

            <section>
              <h2 className="legal-h2">8. Bezpieczeństwo danych</h2>
              <p className="mb-4">
                Administrator stosuje odpowiednie środki techniczne i organizacyjne zapewniające 
                ochronę danych osobowych przed nieuprawnionym dostępem, utratą, zniszczeniem, 
                zmianą lub ujawnieniem, w tym:
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Szyfrowanie połączeń (SSL/TLS)</li>
                <li>Regularne aktualizacje oprogramowania</li>
                <li>Ograniczenie dostępu do danych osobowych tylko do osób uprawnionych</li>
                <li>Regularne kopie zapasowe danych</li>
                <li>Monitorowanie bezpieczeństwa Serwisu</li>
              </ul>
            </section>

            <section>
              <h2 className="legal-h2">9. Dane przechowywane lokalnie</h2>
              <p className="mb-4">
                Część danych jest przechowywana lokalnie w przeglądarce użytkownika (localStorage), 
                w tym:
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Postęp w kalendarzu adwentowym</li>
                <li>Preferencje użytkownika</li>
                <li>Zgoda na wykorzystanie plików cookie</li>
              </ul>
              <p className="mb-4">
                Te dane nie są przesyłane na serwery Administratora i pozostają wyłącznie 
                na urządzeniu użytkownika. Użytkownik może w każdej chwili wyczyścić te dane 
                w ustawieniach przeglądarki.
              </p>
            </section>

            <section>
              <h2 className="legal-h2">10. Przekazywanie danych poza EOG</h2>
              <p className="mb-4">
                Niektóre dane mogą być przekazywane do dostawców usług mających siedzibę poza 
                Europejskim Obszarem Gospodarczym (EOG), w szczególności:
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>Google Analytics</strong> - dane są przekazywane do Google LLC (USA), 
                    które posiada odpowiednie zabezpieczenia zgodne z RODO (Standard Contractual Clauses)</li>
              </ul>
            </section>

            <section>
              <h2 className="legal-h2">11. Automatyczne podejmowanie decyzji i profilowanie</h2>
              <p className="mb-4">
                Administrator nie podejmuje decyzji w sposób zautomatyzowany, w tym przez 
                profilowanie, które wywołują wobec użytkownika skutki prawne lub w podobny sposób 
                istotnie wpływają na jego sytuację.
              </p>
            </section>

            <section>
              <h2 className="legal-h2">12. Zmiany w polityce prywatności</h2>
              <p className="mb-4">
                Administrator zastrzega sobie prawo do wprowadzania zmian w niniejszej polityce 
                prywatności. O wszelkich istotnych zmianach użytkownik zostanie poinformowany 
                przez publikację nowej wersji polityki w Serwisie lub poprzez wysłanie 
                powiadomienia e-mail.
              </p>
            </section>

            <section>
              <h2 className="legal-h2">13. Kontakt</h2>
              <p className="mb-4">
                W sprawach dotyczących przetwarzania danych osobowych oraz realizacji praw 
                użytkownika, prosimy o kontakt:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="font-semibold mb-2">inTaz Bartosz Kuligowski</p>
                <p>NIP: 7812010357</p>
                <p>Siedziba: Rokietnica</p>
                <p>Email: <strong>kontakt@e-advent.pl</strong></p>
              </div>
            </section>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded mt-6">
              <p className="text-sm text-gray-700">
                <strong>Data ostatniej aktualizacji:</strong> {new Date().toLocaleDateString('pl-PL', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
        </ContentCard>
    </FestivePage>
  );
}
