import { Link } from 'react-router-dom';
import FestivePage from '../components/FestivePage';
import ContentCard from '../components/ContentCard';

export default function PaymentError() {
  return (
    <FestivePage showLogo={false} maxWidth="md">
      <ContentCard variant="error" padding="lg">
        <div className="text-center">
          <div className="mb-6">
            <i className="fas fa-exclamation-triangle text-christmas-red text-7xl md:text-8xl drop-shadow-lg" />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-christmas-red font-calligraphy">
            Niestety nie udało się
          </h1>

          <p className="text-xl text-parchment-muted mb-8">
            Płatność nie została zakończona pomyślnie.
          </p>

          <div className="alert-error mb-6 text-left">
            <p className="mb-3 font-semibold">
              <i className="fas fa-info-circle mr-2" />
              Co mogło się stać?
            </p>
            <ul className="space-y-2 ml-6 list-disc text-parchment-muted">
              <li>Płatność została anulowana</li>
              <li>Wystąpił błąd podczas przetwarzania płatności</li>
              <li>Karta została odrzucona przez bank</li>
            </ul>
          </div>

          <div className="alert-info mb-8 text-left">
            <p>
              <i className="fas fa-shield-alt mr-2" />
              <strong>Nie martw się!</strong> Twoje dane zostały zapisane. Możesz spróbować ponownie
              bez konieczności ponownego uzupełniania formularza.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/platnosc" className="btn-red flex-1 py-4 px-6 text-lg">
              <i className="fas fa-redo" />
              Spróbuj ponownie
            </Link>
            <Link to="/" className="btn-green flex-1 py-4 px-6 text-lg">
              <i className="fas fa-home" />
              Strona główna
            </Link>
          </div>

          <p className="mt-8 text-gray-500 text-sm">
            <i className="fas fa-question-circle text-christmas-red mr-1" />
            Jeśli problem się powtarza, skontaktuj się z nami: kontakt@e-advent.pl
          </p>
        </div>
      </ContentCard>
    </FestivePage>
  );
}
