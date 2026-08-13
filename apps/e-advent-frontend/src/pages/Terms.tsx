import FestivePage from '../components/FestivePage';
import ContentCard from '../components/ContentCard';

export default function Terms() {
  return (
    <FestivePage>
      <ContentCard padding="lg">
        <h1 className="heading-page mb-8">
          Regulamin świadczenia usług drogą elektroniczną
        </h1>

        <div className="prose-legal space-y-6">
            <section>
              <h2 className="legal-h2">1. Postanowienia ogólne</h2>
              <p className="mb-4">
                Niniejszy regulamin określa zasady korzystania z serwisu internetowego e-Advent 
                dostępnego pod adresem e-advent.pl (dalej: "Serwis") oraz zasady świadczenia usług 
                drogą elektroniczną przez Administratora.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="font-semibold mb-2">Administrator Serwisu:</p>
                <p>inTaz Bartosz Kuligowski</p>
                <p>NIP: 7812010357</p>
                <p>Siedziba: Rokietnica</p>
                <p>Email: kontakt@e-advent.pl</p>
              </div>
              <p className="mb-4">
                Korzystanie z Serwisu oznacza akceptację niniejszego regulaminu. W przypadku 
                braku akceptacji postanowień regulaminu, Użytkownik zobowiązany jest do 
                niekorzystania z Serwisu.
              </p>
            </section>

            <section>
              <h2 className="legal-h2">2. Definicje</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Administrator</strong> - inTaz Bartosz Kuligowski, NIP 7812010357, 
                    z siedzibą w Rokietnicy</li>
                <li><strong>Serwis</strong> - serwis internetowy dostępny pod adresem e-advent.pl</li>
                <li><strong>Użytkownik</strong> - osoba fizyczna, osoba prawna lub jednostka organizacyjna 
                    nieposiadająca osobowości prawnej, korzystająca z Serwisu</li>
                <li><strong>Usługa</strong> - usługa świadczona przez Administratora drogą elektroniczną,
                    polegająca na umożliwieniu Użytkownikowi utworzenia personalizowanego kalendarza adwentowego
                    (interaktywnego online lub fizycznej zdrapki)</li>
                <li><strong>Kalendarz</strong> - spersonalizowany kalendarz adwentowy utworzony przez Użytkownika w ramach Serwisu</li>
                <li><strong>Produkt fizyczny</strong> - kalendarz zdrapka wytwarzany na zamówienie i wysyłany na adres podany przez Użytkownika</li>
              </ul>
            </section>

            <section>
              <h2 className="legal-h2">3. Zasady korzystania z Serwisu</h2>
              <p className="mb-4">
                e-Advent oferuje dwa warianty personalizowanego kalendarza adwentowego:
                interaktywny (online) oraz fizyczna zdrapka. Użytkownik dodaje własne zadania
                i — w przypadku produktów fizycznych — wybiera grafikę oraz format (A4 lub A3).
              </p>
              <p className="mb-4">Użytkownik zobowiązuje się do:</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Podawania danych zgodnych z prawdą</li>
                <li>Niepodawania danych osobowych innych osób bez ich zgody</li>
                <li>Korzystania z Serwisu w sposób zgodny z prawem i dobrymi obyczajami</li>
                <li>Niezamieszczania treści bezprawnych, obraźliwych, naruszających prawa osób trzecich</li>
                <li>Niepodejmowania działań mogących zakłócić funkcjonowanie Serwisu</li>
              </ul>
            </section>

            <section>
              <h2 className="legal-h2">4. Rejestracja i dostęp do usługi</h2>
              <p className="mb-4">
                Aby skorzystać z usługi, Użytkownik zobowiązany jest do podania prawidłowych 
                danych osobowych (imię, adres e-mail) oraz utworzenia kalendarza poprzez 
                wypełnienie formularza dostępnego w Serwisie.
              </p>
              <p className="mb-4">
                Po dokonaniu płatności, Użytkownik otrzymuje unikalny link do swojego kalendarza, 
                który umożliwia dostęp do utworzonego kalendarza.
              </p>
            </section>

            <section>
              <h2 className="legal-h2">5. Cena i płatność</h2>
              <p className="mb-4">
                Ceny produktów (brutto, zawierają podatek VAT 23%):
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Kalendarz interaktywny — 9 zł (produkt cyfrowy, bez wysyłki)</li>
                <li>Kalendarz zdrapka A4 — 49 zł; A3 — 69 zł</li>
                <li>List do Świętego Mikołaja (zestaw) — 29 zł</li>
                <li>Wysyłka produktów fizycznych — 5 zł (Poczta Polska); darmowa przy wartości produktów od 100 zł</li>
              </ul>
              <p className="mb-4">
                Płatność odbywa się online przez system płatności elektronicznych (Stripe).
                Po opłaceniu kalendarza interaktywnego Użytkownik otrzymuje link na e-mail.
                Po opłaceniu produktu fizycznego Użytkownik otrzymuje potwierdzenie zamówienia na e-mail.
              </p>
            </section>

            <section>
              <h2 className="legal-h2">5a. Produkty fizyczne — wysyłka</h2>
              <p className="mb-4">
                Produkty fizyczne (kalendarz zdrapka, list do Świętego Mikołaja) są przygotowywane po zaksięgowaniu płatności
                i wysyłane Pocztą Polską na adres podany w formularzu zamówienia (terytorium Polski).
                Standardowy czas realizacji wynosi 3–5 dni roboczych; w okresie wysokiego obciążenia sezonowego może wydłużyć się do 14 dni roboczych.
                Przy zamówieniu produktów o łącznej wartości od 100 zł (bez kosztów wysyłki) wysyłka jest bezpłatna.
              </p>
              <p className="mb-4">
                Użytkownik ponosi odpowiedzialność za poprawność adresu wysyłki. W przypadku produktów fizycznych
                Użytkownik ma prawo odstąpić od umowy w terminie 14 dni od otrzymania przesyłki, z wyjątkiem
                produktów wykonanych na indywidualne zamówienie (art. 38 pkt 3 ustawy o prawach konsumenta),
                o ile produkt nie nosi śladów użytkowania. Gotowy zestaw „List do Świętego Mikołaja” nie jest
                produktem personalizowanym online — dziecko uzupełnia treść samodzielnie na papierze.
              </p>
            </section>

            <section>
              <h2 className="legal-h2">6. Odpowiedzialność za treści</h2>
              <p className="mb-4">
                Użytkownik ponosi pełną odpowiedzialność za treści zadań dodanych przez niego 
                do kalendarza. Administrator nie ponosi odpowiedzialności za treść zadań 
                dodanych przez użytkowników.
              </p>
              <p className="mb-4">
                Użytkownik zobowiązuje się, że zamieszczane przez niego treści nie naruszają 
                praw osób trzecich, w szczególności praw autorskich, praw własności intelektualnej, 
                praw do wizerunku, praw do danych osobowych.
              </p>
            </section>

            <section>
              <h2 className="legal-h2">7. Zwroty i reklamacje</h2>
              <p className="mb-4">
                Ze względu na cyfrowy charakter usługi, która jest świadczona natychmiast po 
                dokonaniu płatności, prawo do odstąpienia od umowy (zwrotu środków) nie przysługuje 
                Użytkownikowi zgodnie z art. 38 pkt 1 ustawy z dnia 30 maja 2014 r. o prawach 
                konsumenta.
              </p>
              <p className="mb-4">
                W przypadku wystąpienia problemów technicznych uniemożliwiających korzystanie 
                z kalendarza, Użytkownik ma prawo złożyć reklamację. Reklamacje należy składać 
                na adres e-mail: kontakt@e-advent.pl.
              </p>
              <p className="mb-4">
                Administrator rozpatruje reklamacje w ciągu 14 dni roboczych od dnia ich otrzymania.
              </p>
            </section>

            <section>
              <h2 className="legal-h2">8. Odpowiedzialność</h2>
              <p className="mb-4">
                Administrator dokłada wszelkich starań, aby Serwis funkcjonował prawidłowo. 
                Nie ponosi jednak odpowiedzialności za tymczasowe niedostępności Serwisu wynikające 
                z przyczyn technicznych niezależnych od Administratora.
              </p>
              <p className="mb-4">
                Administrator nie ponosi odpowiedzialności za szkody powstałe w wyniku korzystania 
                lub niemożności korzystania z Serwisu, chyba że szkoda została wyrządzona 
                umyślnie lub z winy Administratora.
              </p>
            </section>

            <section>
              <h2 className="legal-h2">9. Własność intelektualna</h2>
              <p className="mb-4">
                Wszystkie treści zamieszczone w Serwisie, w tym grafiki, teksty, logo, znaki 
                towarowe są chronione prawem autorskim i stanowią własność Administratora lub 
                osób trzecich, które udzieliły licencji Administratorowi.
              </p>
              <p className="mb-4">
                Użytkownik nie ma prawa do kopiowania, rozpowszechniania lub wykorzystywania 
                treści Serwisu bez zgody Administratora.
              </p>
            </section>

            <section>
              <h2 className="legal-h2">10. Ochrona danych osobowych</h2>
              <p className="mb-4">
                Zasady przetwarzania danych osobowych przez Administratora określa 
                <strong> Polityka prywatności</strong>, która stanowi integralną część 
                niniejszego regulaminu.
              </p>
            </section>

            <section>
              <h2 className="legal-h2">11. Postanowienia końcowe</h2>
              <p className="mb-4">
                Administrator zastrzega sobie prawo do wprowadzania zmian w Regulaminie. 
                O zmianach Użytkownik zostanie poinformowany przez publikację nowej wersji 
                Regulaminu w Serwisie.
              </p>
              <p className="mb-4">
                W sprawach nieuregulowanych w Regulaminie mają zastosowanie przepisy prawa polskiego, 
                w szczególności Kodeksu cywilnego oraz ustawy o świadczeniu usług drogą elektroniczną.
              </p>
              <p className="mb-4">
                Ewentualne spory między Użytkownikiem a Administratorem będą rozstrzygane przez 
                sądy właściwe według przepisów prawa polskiego.
              </p>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded mt-6">
                <p className="text-sm text-gray-700">
                  <strong>Data ostatniej aktualizacji:</strong> {new Date().toLocaleDateString('pl-PL', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </section>
          </div>
        </ContentCard>
    </FestivePage>
  );
}
