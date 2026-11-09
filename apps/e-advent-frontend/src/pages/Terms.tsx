import { Link } from 'react-router-dom';
import FestivePage from '../components/FestivePage';
import ContentCard from '../components/ContentCard';
import SEOHead from '../components/SEOHead';
import { formatPrice, getProduct } from '../config/products';

function price(...skus: string[]) {
  return formatPrice(skus.reduce((sum, sku) => sum + getProduct(sku)!.basePrice, 0));
}

export default function Terms() {
  return (
    <FestivePage>
      <SEOHead title="Regulamin sklepu | e-Advent" description="Regulamin e-Advent: zasady zamówień, płatności, dostawy i reklamacji." canonical="https://e-advent.pl/regulamin" />
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
                    (online lub fizycznej zdrapki) oraz zamówienia produktów fizycznych i wiadomości głosowych</li>
                <li><strong>Kalendarz</strong> - spersonalizowany kalendarz adwentowy utworzony przez Użytkownika w ramach Serwisu</li>
                <li><strong>Produkt fizyczny</strong> — kalendarz zdrapka, gotowy zestaw listu lub personalizowany certyfikat z imieniem.</li>
                <li><strong>Wiadomość głosowa</strong> — personalizowane nagranie MP3 przygotowane z wykorzystaniem syntezy mowy, dostarczane jako treść cyfrowa przez prywatny link; nie jest rozmową na żywo.</li>
              </ul>
            </section>

            <section>
              <h2 className="legal-h2">3. Zasady korzystania z Serwisu</h2>
              <p className="mb-4">
                e-Advent oferuje dwa warianty personalizowanego kalendarza adwentowego:
                online oraz fizyczna zdrapka. Użytkownik dodaje własne zadania
                i — w przypadku produktów fizycznych — wybiera grafikę kalendarza w formacie A3.
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
              <h2 className="legal-h2">4. Zamówienia bez rejestracji i dostęp do produktów</h2>
              <p className="mb-4">Zakupy nie wymagają konta. W koszyku należy podać prawidłowy adres e-mail, na który wysyłamy potwierdzenie zakupu i linki do produktów cyfrowych. Dane do dostawy są wymagane tylko dla produktów fizycznych.</p>
              <p className="mb-4">Przed złożeniem zamówienia Użytkownik sprawdza produkty, ceny, rabat i koszt dostawy oraz akceptuje regulamin. Zamówienie z obowiązkiem zapłaty składa przez przycisk kończący zakup. Potwierdzenie przyjęcia opłaconego zamówienia otrzymuje e-mailem.</p>
            </section>

            <section>
              <h2 className="legal-h2">5. Cena i płatność</h2>
              <p className="mb-4">
                Ceny produktów (brutto, zawierają podatek VAT 23%):
              </p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Kalendarz online — {price('interactive')} (produkt cyfrowy, bez wysyłki)</li>
                <li>Kalendarz zdrapka — {price('scratch-a3')}</li>
                <li>List do Świętego Mikołaja (zestaw) — {price('santa-letter')}</li>
                <li>Certyfikat Grzecznego Dziecka z imieniem — {price('santa-certificate')}, opcjonalnie do listu (również w pakiecie z nagraniem)</li>
                <li>Wiadomość głosowa od Świętego Mikołaja — {price('voice-message')} samodzielnie albo {price('voice-message-addon')} jako dodatek do listu w tym samym zamówieniu, maksymalnie jedna wiadomość w cenie dodatku na każdy list</li>
                <li>List + wiadomość — {price('santa-letter', 'voice-message-addon')}; z jednym certyfikatem — {price('santa-letter', 'voice-message-addon', 'santa-certificate')}, przed doliczeniem dostawy i ewentualnego rabatu. Nagranie i certyfikat są osobnymi, opcjonalnymi pozycjami zamówienia.</li>
                <li>Dostawa produktów fizycznych — Paczkomat lub kurier InPost; koszt jest wyświetlany przed płatnością i zależy od rodzaju przesyłki</li>
              </ul>
              <p className="mb-4">
                Płatność odbywa się online przez system płatności elektronicznych (Stripe).
                Po opłaceniu kalendarza online Użytkownik otrzymuje link na e-mail.
                Po opłaceniu produktu fizycznego Użytkownik otrzymuje potwierdzenie zamówienia na e-mail.
              </p>
            </section>

            <section>
              <h2 className="legal-h2">5a. Produkty fizyczne — wysyłka</h2>
              <p className="mb-4">
                Produkty fizyczne (kalendarz zdrapka, list do Świętego Mikołaja) są przygotowywane po zaksięgowaniu płatności
                i wysyłane InPost do wybranego Paczkomatu lub na podany adres (terytorium Polski).
                Standardowy czas realizacji wynosi 3–5 dni roboczych; w okresie wysokiego obciążenia sezonowego może wydłużyć się do 14 dni roboczych.
                Wartość wiadomości głosowych nie zwiększa kwoty uprawniającej do darmowej dostawy. Warunki i ostateczny koszt dostawy są widoczne w podsumowaniu przed zakupem.
              </p>
              <p className="mb-4">
                Użytkownik ponosi odpowiedzialność za poprawność adresu wysyłki.
                Szczegółowe informacje o dostawie znajdują się na stronie{' '}
                <Link to="/dostawa-i-zwroty" className="text-christmas-green hover:underline font-medium">
                  Dostawa i zwroty
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="legal-h2">5b. Wiadomość głosowa — personalizacja i dostarczenie</h2>
              <p className="mb-4">Dane dziecka Użytkownik podaje w kreatorze przed zakupem albo po opłaceniu zamówienia przez link przesłany e-mailem. Na ich podstawie przygotowujemy nagranie, zwykle w ciągu 24 godzin od opłacenia zamówienia i uzupełnienia danych; o ewentualnym opóźnieniu informujemy e-mailem. Dane podane w kreatorze można zmieniać do chwili złożenia zamówienia.</p>
              <p className="mb-4">Nagranie trwa zwykle około 1,5 minuty, maksymalnie około 2 minut. Nie należy podawać danych o zdrowiu, adresu, szkoły ani innych informacji, które nie są potrzebne do przygotowania życzeń. Zamówienie składa osoba dorosła uprawniona do przekazania danych dziecka.</p>
              <p className="mb-4">Gotowe nagranie udostępniamy przez prywatny link do strony e-Advent wysłany na e-mail zamówienia. Strona pozwala na wielokrotne odtwarzanie i pobranie MP3. Link działa przez 365 dni od pierwszego dostarczenia nagrania; termin widoczny jest na stronie. Pobrany plik można zachować na własnym urządzeniu. Wiadomość nie obejmuje certyfikatu PDF; papierowy certyfikat można dokupić do listu.</p>
              <p className="mb-4">Link daje dostęp każdej osobie, która go posiada — należy przekazywać go wyłącznie zaufanym osobom. Same pliki są przechowywane w prywatnym magazynie Cloudflare R2 i udostępniane przez API e-Advent po sprawdzeniu uprawnienia. Do odsłuchu potrzebna jest aktualna przeglądarka z obsługą MP3, JavaScript i dostęp do internetu; po pobraniu wystarczy odtwarzacz MP3. Nie ma potrzeby instalowania aplikacji ani logowania.</p>
              <p className="mb-4">List i certyfikat dostarczamy przesyłką niezależnie od nagrania. Brak uzupełnienia personalizacji wstrzymuje przygotowanie wiadomości głosowej.</p>
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
              <p className="mb-4">Konsument może odstąpić od umowy zawartej na odległość w ciągu 14 dni: dla towaru od jego otrzymania, a dla treści cyfrowej od zawarcia umowy, z wyjątkami przewidzianymi w ustawie. Oświadczenie można wysłać na kontakt@e-advent.pl. Uprawnienia konsumenckie stosujemy również do przedsiębiorców korzystających z ochrony konsumenckiej na zasadach określonych w ustawie.</p>
              <p className="mb-4">Wyjątek z art. 38 ust. 1 pkt 3 ustawy o prawach konsumenta obejmuje fizyczną zdrapkę wykonaną według specyfikacji klienta oraz certyfikat z imieniem. Nie dotyczy gotowego zestawu listu ani samych treści cyfrowych.</p>
              <p className="mb-4">W przypadku odpłatnej treści cyfrowej niedostarczanej na nośniku materialnym (w tym wiadomości głosowej) utrata prawa odstąpienia wymaga spełnienia przesłanek art. 38 ust. 1 pkt 13 ustawy: uprzedniej, wyraźnej zgody na rozpoczęcie świadczenia, poinformowania o utracie prawa po spełnieniu świadczenia, przyjęcia tego do wiadomości oraz przekazania potwierdzenia zawarcia umowy. Zgoda dotycząca wiadomości głosowej jest osobnym polem przy zakupie, a jej treść i data są potwierdzane e-mailem. Sama personalizacja ani samo zaznaczenie akceptacji regulaminu nie wyłączają prawa odstąpienia.</p>
              <p className="mb-4">Gotowy list można zwrócić w ustawowym terminie także wtedy, gdy był kupiony w pakiecie z wiadomością lub certyfikatem. Ocena prawa odstąpienia następuje osobno dla każdej pozycji. Konsument odpowiada jedynie za zmniejszenie wartości towaru wynikające z korzystania wykraczającego poza konieczne sprawdzenie jego charakteru, cech i funkcjonowania.</p>
              <p className="mb-4">Niezależnie od prawa odstąpienia sprzedawca odpowiada za zgodność towaru i treści cyfrowej z umową. W razie niezgodności przysługują ustawowe środki ochrony, w tym żądanie doprowadzenia do zgodności, a w przewidzianych prawem przypadkach obniżenie ceny lub odstąpienie. Reklamacje, także dotyczące błędnego nagrania, braku dostępu lub pobrania MP3, można zgłaszać na kontakt@e-advent.pl. Odpowiadamy w ciągu 14 dni od otrzymania reklamacji.</p>
              <p className="mb-4">Szczegóły zwrotu produktów fizycznych: <Link to="/dostawa-i-zwroty" className="link-inline">Dostawa i zwroty</Link>.</p>
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
                Pobrane nagranie można zachować i odtwarzać w prywatnym kręgu rodzinnym. Pozostałe kopiowanie, publiczne rozpowszechnianie lub komercyjne wykorzystywanie 
                treści Serwisu wymaga zgody uprawnionego, z zastrzeżeniem dozwolonego użytku.
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
                Regulaminu w Serwisie. Do wcześniej złożonych zamówień stosuje się wersję obowiązującą przy ich złożeniu.
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
                  <strong>Data ostatniej aktualizacji:</strong> 6 listopada 2026 r.
                </p>
              </div>
            </section>
          </div>
        </ContentCard>
    </FestivePage>
  );
}
