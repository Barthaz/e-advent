interface ExportGeneratingModalProps {
  kind: 'pdf' | 'png';
}

export default function ExportGeneratingModal({ kind }: ExportGeneratingModalProps) {
  const label = kind === 'pdf'
    ? 'Trwa generowanie pliku PDF…'
    : 'Trwa generowanie pliku PNG…';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="panel-card max-w-sm w-full p-6 text-center shadow-lg">
        <span className="spinner mx-auto mb-4" />
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-2">To może potrwać kilkanaście sekund.</p>
      </div>
    </div>
  );
}
