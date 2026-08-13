interface LoadingStateProps {
  message?: string;
  variant?: 'light' | 'festive';
}

export default function LoadingState({ message = 'Ładowanie...', variant = 'festive' }: LoadingStateProps) {
  if (variant === 'light') {
    return (
      <div className="min-h-screen flex items-center justify-center section-cream">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-xl text-parchment-muted">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-bg-gradient min-h-screen flex items-center justify-center text-white">
      <div className="page-bg-texture" />
      <div className="relative z-10 text-center">
        <div className="spinner mx-auto mb-4 border-white/20 border-b-christmas-gold-light" />
        <p className="text-xl">{message}</p>
      </div>
    </div>
  );
}
