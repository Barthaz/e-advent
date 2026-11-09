interface LoadingStateProps {
  message?: string;
  variant?: 'light' | 'festive';
}

export default function LoadingState({ message = 'Ładowanie...', variant = 'festive' }: LoadingStateProps) {
  const festive = variant === 'festive';

  return (
    <div className={`min-h-screen flex items-center justify-center ${festive ? 'page-bg-gradient text-white' : 'bg-[#f3eadc] text-christmas-green'}`}>
      <div className="text-center">
        <div className={`spinner mx-auto mb-4 ${festive ? 'border-white/20 border-b-christmas-gold-light' : 'border-christmas-green/15 border-b-christmas-green'}`} />
        <p className={`text-xl ${festive ? 'text-white/85' : 'text-christmas-green'}`}>{message}</p>
      </div>
    </div>
  );
}
