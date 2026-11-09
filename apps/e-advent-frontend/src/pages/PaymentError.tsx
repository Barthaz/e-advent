import { Link } from 'react-router-dom';
import OrderResultLayout from '../components/checkout/OrderResultLayout';

export default function PaymentError() {
  return <OrderResultLayout>
    <div className="text-center">
      <p className="order-eyebrow">Twoje zamówienie</p>
      <h1 className="font-display text-4xl md:text-5xl mb-5">Dokończmy płatność</h1>
      <p className="order-help mb-7">Nie otrzymaliśmy potwierdzenia udanej płatności. Mogła zostać przerwana lub odrzucona przez bank.</p>
      <div className="order-result-note text-left mb-7">
        <p>Jeśli środki zostały pobrane, nie płać ponownie. Poczekaj na potwierdzenie e-mail lub napisz do nas — sprawdzimy Twoje zamówienie.</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link to="/platnosc" className="btn-green flex-1 py-3 px-5">Wróć do płatności <i className="fas fa-arrow-right" aria-hidden="true" /></Link>
        <Link to="/koszyk" className="btn-secondary flex-1 py-3 px-5">Sprawdź koszyk</Link>
      </div>
      <p className="order-help mt-7">Potrzebujesz pomocy? <a className="underline underline-offset-4" href="mailto:kontakt@e-advent.pl">kontakt@e-advent.pl</a></p>
    </div>
  </OrderResultLayout>;
}
