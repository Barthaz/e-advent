import FormField from '../FormField';

interface StepBasicInfoProps {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  calendarTitle: string;
  setCalendarTitle: (v: string) => void;
  showEmailReminders?: boolean;
  dailyEmailReminders?: boolean;
  setDailyEmailReminders?: (v: boolean) => void;
}

export default function StepBasicInfo({
  name,
  setName,
  email,
  setEmail,
  calendarTitle,
  setCalendarTitle,
}: StepBasicInfoProps) {
  return (
    <section>
      <h2 className="heading-section mb-4">Informacje podstawowe</h2>
      <FormField label="Twoje imię" value={name} onChange={setName} placeholder="Jan" required />
      <FormField label="Email" type="email" value={email} onChange={setEmail} placeholder="jan@example.com" required />
      <FormField
        label="Tytuł kalendarza"
        value={calendarTitle}
        onChange={setCalendarTitle}
        placeholder="Mój Kalendarz Adwentowy"
      />
    </section>
  );
}
