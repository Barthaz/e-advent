import type { FieldName, Personalization } from './validation';

const STORY_FIELDS: Array<{ name: FieldName; label: string }> = [
  { name: 'achievement', label: 'Sukces w tym roku' },
  { name: 'proudOf', label: 'Powód do dumy' },
  { name: 'workingOn', label: 'Nad czym pracuje' },
  { name: 'wishes', label: 'Świąteczne marzenia' },
  { name: 'siblingsNote', label: 'Rodzeństwo lub bliscy' },
];

export default function PersonalizationSummary({ value }: { value: Personalization }) {
  const story = STORY_FIELDS.filter((field) => value[field.name]?.trim());
  return (
    <dl className="grid sm:grid-cols-2 gap-3 text-sm">
      <div className="rounded-xl bg-white/60 p-3 sm:col-span-2">
        <dt className="text-parchment-muted">Dziecko</dt>
        <dd className="text-parchment-text font-semibold">
          {value.childName}
          {value.childVocative && value.childVocative !== value.childName ? ` („${value.childVocative}”)` : ''}
        </dd>
      </div>
      {story.map((field) => (
        <div key={field.name} className="rounded-xl bg-white/60 p-3">
          <dt className="text-parchment-muted">{field.label}</dt>
          <dd className="text-parchment-text break-words">{value[field.name]}</dd>
        </div>
      ))}
    </dl>
  );
}
