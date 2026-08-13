import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import FestivePage from './FestivePage';
import ContentCard from './ContentCard';

interface StatusMessagePageProps {
  icon: string;
  iconClassName?: string;
  title: string;
  description: string | ReactNode;
  extra?: ReactNode;
}

export default function StatusMessagePage({
  icon,
  iconClassName = 'text-christmas-green',
  title,
  description,
  extra,
}: StatusMessagePageProps) {
  const navigate = useNavigate();

  return (
    <FestivePage maxWidth="sm">
      <ContentCard variant="gold" padding="md">
        <div className="text-center">
          <div className="mb-6">
            <i className={`${icon} ${iconClassName} text-6xl mb-4`} />
          </div>
          <h1 className="heading-page mb-4">{title}</h1>
          <div className="text-parchment-muted text-lg mb-6">{description}</div>
          {extra}
          <button onClick={() => navigate('/')} className="btn-green px-6 py-3">
            Wróć na stronę główną
          </button>
        </div>
      </ContentCard>
    </FestivePage>
  );
}
