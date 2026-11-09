import { Link } from 'react-router-dom';
import FestivePage from '../components/FestivePage';
import ContentCard from '../components/ContentCard';
import SEOHead from '../components/SEOHead';
import { PHYSICAL_FULFILLMENT_TIME } from '../config/products';

export default function ShippingAndReturns() {
  return (
    <FestivePage>
      <SEOHead
        title="Dostawa i zwroty | e-Advent"
        description="Informacje o dostawie produktów fizycznych e-Advent, kosztach wysyłki oraz zasadach zwrotów i odstąpienia od umowy dla produktów personalizowanych."
        canonical="https://e-advent.pl/dostawa-i-zwroty"
      />
      <ContentCard padding="lg">
        <h1 className="heading-page mb-8">Dostawa i zwroty</h1>

        <div className="prose-legal space-y-6">
          <section>
            <h2 className="legal-h2">1. Dostawa</h2>
            <p className="mb-4">
              Produkty fizyczne (kalendarz zdrapka, zestaw „List do Świętego Mikołaja”) są
              przygotowywane po zaksięgowaniu płatności i wysyłane na adres podany w formularzu
              zamówienia.
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                <strong>Sposób dostawy:</strong> Paczkomat lub kurier InPost (na terenie Polski)
              </li>
              <li>
                <strong>Koszt wysyłki:</strong> wyliczany przy składaniu zamówienia na podstawie zawartości koszyka i wybranej metody dostawy
              </li>
              <li>
                <strong>Czas realizacji:</strong> standardowo {PHYSICAL_FULFILLMENT_TIME}; w okresie
                wysokiego obciążenia sezonowego może wydłużyć się do 14 dni roboczych
              </li>
            </ul>
            <p className="mb-4">
              Kalendarz online jest produktem cyfrowym — po opłaceniu Użytkownik otrzymuje
              link dostępowy na podany adres e-mail; nie wymaga wysyłki pocztowej.
            </p>
            <p className="mb-4">
              Użytkownik ponosi odpowiedzialność za poprawność adresu dostawy. W przypadku
              podania błędnego adresu Administrator nie odpowiada za niedostarczenie przesyłki
              lub opóźnienia wynikające z tej przyczyny.
            </p>
            <p className="mb-4">
              Szczegółowe zasady sprzedaży i realizacji zamówień określa{' '}
              <Link to="/regulamin" className="text-christmas-green hover:underline font-medium">
                Regulamin
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="legal-h2">2. Zwroty i odstąpienie od umowy</h2>
            <p className="mb-4">
              Zgodnie z art. 38 ustawy z dnia 30 maja 2014 r. o prawach konsumenta konsumentowi
              nie przysługuje prawo odstąpienia od umowy (zwrotu) w przypadkach wskazanych poniżej.
            </p>

            <h3 className="legal-h3">2.1. Produkty personalizowane i wykonywane na zamówienie</h3>
            <p className="mb-4">
              Fizyczne kalendarze zdrapki są produktami{' '}
              <strong>spersonalizowanymi i wykonywanymi na indywidualne zamówienie</strong> —
              Użytkownik samodzielnie ustala treści zadań oraz (w przypadku zdrapki) wybiera
              grafikę i format. Zgodnie z{' '}
              <strong>art. 38 pkt 3 ustawy o prawach konsumenta</strong> prawo odstąpienia od
              umowy nie przysługuje w odniesieniu do umów, w których przedmiotem świadczenia jest
              rzecz nieprefabrykowana, wyprodukowana według specyfikacji konsumenta lub służąca
              zaspokojeniu jego zindywidualizowanych potrzeb.
            </p>
            <p className="mb-4">
              Analogicznie, prawo odstąpienia nie przysługuje wobec dodatków personalizowanych
              (np. Certyfikat Grzecznego Dziecka z imieniem dziecka), które są wykonywane według
              indywidualnych danych podanych przy zamówieniu.
            </p>

            <h3 className="legal-h3">2.2. Treści cyfrowe</h3>
            <p className="mb-4">Kalendarz online i wiadomość głosowa są treściami cyfrowymi. Sama personalizacja nie wyłącza prawa odstąpienia. Dla odpłatnych treści cyfrowych jego utrata wymaga uprzedniej, wyraźnej zgody, poinformowania o utracie prawa po spełnieniu świadczenia i przyjęcia tego do wiadomości oraz potwierdzenia zawarcia umowy na trwałym nośniku, zgodnie z art. 38 ust. 1 pkt 13 ustawy o prawach konsumenta.</p>
            <p className="mb-4">Nagranie od Mikołaja dostarczamy e-mailem jako prywatny link po przygotowaniu wiadomości, zwykle w ciągu 24 godzin od zatwierdzenia tekstu. Można je wielokrotnie odsłuchać i pobrać jako MP3 przez 365 dni od pierwszego dostarczenia. Nie naliczamy za nie kosztów przesyłki. W pakiecie list i certyfikat są wysyłane osobno od nagrania.</p>

            <h3 className="legal-h3">2.3. Produkty gotowe (niepersonalizowane)</h3>
            <p className="mb-4">
              Gotowy zestaw „List do Świętego Mikołaja” (bez personalizacji online — dziecko
              uzupełnia treść samodzielnie na papierze) nie jest produktem wykonywanym według
              indywidualnej specyfikacji. W przypadku tego produktu konsumentowi przysługuje prawo
              odstąpienia od umowy w terminie 14 dni od otrzymania przesyłki. Korzystanie z produktu ponad zakres niezbędny do sprawdzenia jego cech może skutkować odpowiedzialnością za zmniejszenie jego wartości. Zakup w pakiecie z nagraniem lub certyfikatem nie odbiera prawa zwrotu gotowego listu.
            </p>
            <p className="mb-4">
              Aby skorzystać z prawa odstąpienia, należy przesłać oświadczenie na adres e-mail:{' '}
              <a href="mailto:kontakt@e-advent.pl" className="text-christmas-green hover:underline">
                kontakt@e-advent.pl
              </a>
              . Towar należy odesłać w ciągu 14 dni od odstąpienia; bezpośredni koszt zwrotu ponosi konsument. Zwrot zapłaty, wraz z kosztem najtańszej zwykłej dostawy oferowanej dla zwracanej przesyłki, następuje w ciągu 14 dni od otrzymania oświadczenia. Możemy wstrzymać zwrot do otrzymania towaru lub dowodu jego odesłania, zależnie od tego, co nastąpi wcześniej. Dane do odesłania towaru przekażemy w odpowiedzi na zgłoszenie.
            </p>
          </section>

          <section>
            <h2 className="legal-h2">3. Reklamacje</h2>
            <p className="mb-4">
              Niezależnie od braku prawa odstąpienia od umowy w przypadkach wskazanych powyżej,
              Użytkownikowi przysługują uprawnienia z tytułu niezgodności towaru lub treści cyfrowej z umową oraz możliwość
              złożenia reklamacji, w szczególności gdy:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>produkt fizyczny dotarł uszkodzony lub niepełny,</li>
              <li>wystąpiły problemy techniczne uniemożliwiające korzystanie z kalendarza online,</li>
              <li>zamówienie zostało zrealizowane niezgodnie z ustaleniami.</li>
            </ul>
            <p className="mb-4">
              Reklamacje należy składać na adres:{' '}
              <a href="mailto:kontakt@e-advent.pl" className="text-christmas-green hover:underline">
                kontakt@e-advent.pl
              </a>
              . Administrator rozpatruje reklamacje w ciągu 14 dni od dnia ich otrzymania.
            </p>
          </section>

          <section>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded mt-6">
              <p className="text-sm text-gray-700">
                <strong>Data ostatniej aktualizacji:</strong>{' '}
                6 listopada 2026 r.
              </p>
            </div>
          </section>
        </div>
      </ContentCard>
    </FestivePage>
  );
}
