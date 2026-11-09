import Badge from '../ui/Badge';
import { SANTA_STATUS_BADGE, SANTA_STATUS_LABELS } from '../../utils/constants';

const FIELD_LABELS: Record<string, string> = {
  childName: 'Imię',
  childVocative: 'Wołacz',
  addressForm: 'Forma',
  ageBand: 'Wiek',
  achievement: 'Osiągnięcie',
  proudOf: 'Z czego dumni',
  workingOn: 'Nad czym pracuje',
  wishes: 'Marzenia',
  siblingsNote: 'Rodzeństwo / zwierzak',
};

const ADDRESS_FORM_LABELS: Record<string, string> = { male: 'chłopiec', female: 'dziewczynka', neutral: 'neutralna' };

export function SantaStatusBadge({ status }: { status: string }) {
  return <Badge variant={SANTA_STATUS_BADGE[status] ?? 'pending'} label={SANTA_STATUS_LABELS[status] ?? status} icon="fa-microphone" />;
}

export function SantaPersonalizationList({ personalization }: { personalization: Record<string, string> | null }) {
  if (!personalization) return <p className="text-sm text-gray-500">Klient jeszcze nie uzupełnił danych.</p>;
  return (
    <dl className="space-y-1.5 text-sm">
      {Object.entries(FIELD_LABELS).map(([key, label]) => {
        const raw = personalization[key];
        if (!raw) return null;
        const value = key === 'addressForm' ? ADDRESS_FORM_LABELS[raw] ?? raw : raw;
        return (
          <div key={key} className="grid grid-cols-[8.5rem_1fr] gap-2">
            <dt className="text-gray-500">{label}</dt>
            <dd className="text-gray-800 break-words">{value}</dd>
          </div>
        );
      })}
    </dl>
  );
}
