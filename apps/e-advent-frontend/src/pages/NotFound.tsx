import { Link } from 'react-router-dom';
import FestivePage from '../components/FestivePage';
import ContentCard from '../components/ContentCard';

export default function NotFound() {
  return (
    <FestivePage centered showLogo maxWidth="md">
      <div className="text-center max-w-2xl">
        <h1 className="text-8xl md:text-9xl font-bold text-christmas-gold-light drop-shadow-2xl font-calligraphy mb-4">
          404
        </h1>
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-white mb-4">
          Ups! Strona nie została znaleziona
        </h2>
        <p className="text-lg md:text-xl text-white/80 mb-8 leading-relaxed">
          Wygląda na to, że ta strona zaginęła w śnieżnej zamieci! Może wróciła do Kalendarza
          Adwentowego i czeka na właściwy dzień?
        </p>

        <ContentCard variant="glass" padding="md" className="mb-8">
          <p className="text-lg text-white/90 mb-6">Nie martw się! Możesz wrócić do:</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/" className="btn-gold px-8 py-4 text-lg">
              <i className="fas fa-home" />
              Strona główna
            </Link>
            <Link to="/stworz-kalendarz" className="btn-red px-8 py-4 text-lg">
              <i className="fas fa-gift" />
              Stwórz kalendarz
            </Link>
          </div>
        </ContentCard>

        <p className="text-white/50 text-sm">
          <i className="fas fa-snowflake text-christmas-gold-light mr-2" />
          Pamiętaj, że każdego dnia grudnia możesz otworzyć jedno okienko w kalendarzu adwentowym!
        </p>
      </div>
    </FestivePage>
  );
}
