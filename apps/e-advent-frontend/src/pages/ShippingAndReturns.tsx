import { Link } from 'react-router-dom';
import FestivePage from '../components/FestivePage';
import ContentCard from '../components/ContentCard';
import SEOHead from '../components/SEOHead';
import { FREE_SHIPPING_THRESHOLD, PHYSICAL_FULFILLMENT_TIME, SHIPPING_COST } from '../config/products';

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
                <strong>Sposób dostawy:</strong> Poczta Polska (przesyłka na terenie Polski)
              </li>
              <li>
                <strong>Koszt wysyłki:</strong> {SHIPPING_COST} zł; darmowa przy wartości produktów
                od {FREE_SHIPPING_THRESHOLD} zł (bez kosztów wysyłki)
              </li>
              <li>
                <strong>Czas realizacji:</strong> standardowo {PHYSICAL_FULFILLMENT_TIME}; w okresie
                wysokiego obciążenia sezonowego może wydłużyć się do 14 dni roboczych
              </li>
            </ul>
            <p className="mb-4">
              Kalendarz interaktywny jest produktem cyfrowym — po opłaceniu Użytkownik otrzymuje
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
              Kalendarze adwentowe (interaktywny oraz zdrapka) są produktami{' '}
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

            <h3 className="legal-h3">2.2. Treści cyfrowe dostarczane natychmiast</h3>
            <p className="mb-4">
              Kalendarz interaktywny jest treścią cyfrową niedostarczaną na nośniku trwałym,
              udostępnianą natychmiast po dokonaniu płatności. Zgodnie z{' '}
              <strong>art. 38 pkt 13 ustawy o prawach konsumenta</strong> prawo odstąpienia od
              umowy nie przysługuje, jeżeli spełnianie świadczenia rozpoczęło się za wyraźną zgodą
              konsumenta przed upływem terminu do odstąpienia od umowy i po poinformowaniu go o
              utracie prawa odstąpienia.
            </p>

            <h3 className="legal-h3">2.3. Produkty gotowe (niepersonalizowane)</h3>
            <p className="mb-4">
              Gotowy zestaw „List do Świętego Mikołaja” (bez personalizacji online — dziecko
              uzupełnia treść samodzielnie na papierze) nie jest produktem wykonywanym według
              indywidualnej specyfikacji. W przypadku tego produktu konsumentowi przysługuje prawo
              odstąpienia od umowy w terminie 14 dni od otrzymania przesyłki, o ile produkt nie
              nosi śladów użytkowania uniemożliwiających ponowną sprzedaż.
            </p>
            <p className="mb-4">
              Aby skorzystać z prawa odstąpienia, należy przesłać oświadczenie na adres e-mail:{' '}
              <a href="mailto:kontakt@e-advent.pl" className="text-christmas-green hover:underline">
                kontakt@e-advent.pl
              </a>
              . Zwrot środków następuje niezwłocznie, nie później niż w terminie 14 dni od
              otrzymania oświadczenia i zwrotu towaru.
            </p>
          </section>

          <section>
            <h2 className="legal-h2">3. Reklamacje</h2>
            <p className="mb-4">
              Niezależnie od braku prawa odstąpienia od umowy w przypadkach wskazanych powyżej,
              Użytkownikowi przysługują uprawnienia z tytułu rękojmi za wady oraz możliwość
              złożenia reklamacji, w szczególności gdy:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>produkt fizyczny dotarł uszkodzony lub niepełny,</li>
              <li>wystąpiły problemy techniczne uniemożliwiające korzystanie z kalendarza interaktywnego,</li>
              <li>zamówienie zostało zrealizowane niezgodnie z ustaleniami.</li>
            </ul>
            <p className="mb-4">
              Reklamacje należy składać na adres:{' '}
              <a href="mailto:kontakt@e-advent.pl" className="text-christmas-green hover:underline">
                kontakt@e-advent.pl
              </a>
              . Administrator rozpatruje reklamacje w ciągu 14 dni roboczych od dnia ich otrzymania.
            </p>
          </section>

          <section>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded mt-6">
              <p className="text-sm text-gray-700">
                <strong>Data ostatniej aktualizacji:</strong>{' '}
                {new Date().toLocaleDateString('pl-PL', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </section>
        </div>
      </ContentCard>
    </FestivePage>
  );
}
