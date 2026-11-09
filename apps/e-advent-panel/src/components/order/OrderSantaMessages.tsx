import { Link } from 'react-router-dom';
import { useGetSantaMessageQuery, useGetSantaMessagesQuery } from '../../api/santaMessagesApi';
import LoadingSpinner from '../ui/LoadingSpinner';
import { SantaPersonalizationList, SantaStatusBadge } from '../santa/SantaPersonalization';

function SantaMessageCard({ id, index }: { id: string; index: number }) {
  const { data, isLoading, isError } = useGetSantaMessageQuery(id);
  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">Wiadomość {index + 1}</span>
          {data && <SantaStatusBadge status={data.status} />}
          {data && <span className="text-xs text-gray-500">{data.mode === 'letter_addon' ? 'dodatek do listu' : 'samodzielna'}</span>}
        </div>
        <Link to={`/santa-messages?id=${id}`} className="text-xs font-medium text-christmas-green underline">
          Otwórz wiadomość
        </Link>
      </div>
      {isLoading && <LoadingSpinner size="sm" />}
      {isError && <p className="text-sm text-red-600">Nie udało się wczytać danych wiadomości.</p>}
      {data && <SantaPersonalizationList personalization={data.personalization} />}
    </div>
  );
}

export default function OrderSantaMessages({ orderId, paid }: { orderId: string; paid: boolean }) {
  const { data, isLoading, isError } = useGetSantaMessagesQuery({ q: orderId, limit: 20 });
  const items = (data?.items ?? []).filter((item) => item.orderId === orderId);

  return (
    <section className="panel-card p-5">
      <h2 className="heading-section mb-4">Wiadomość od Mikołaja</h2>
      {isLoading && <LoadingSpinner size="sm" />}
      {isError && <p className="text-sm text-red-600">Nie udało się wczytać wiadomości od Mikołaja.</p>}
      {!isLoading && !isError && items.length === 0 && (
        <p className="text-sm text-gray-500">
          {paid
            ? 'Wiadomość nie została jeszcze utworzona. Odśwież stronę za chwilę lub sprawdź logi API.'
            : 'Wiadomość i dane dziecka pojawią się tutaj po potwierdzeniu płatności.'}
        </p>
      )}
      <div className="space-y-3">
        {items.map((item, index) => <SantaMessageCard key={item.id} id={item.id} index={index} />)}
      </div>
    </section>
  );
}
