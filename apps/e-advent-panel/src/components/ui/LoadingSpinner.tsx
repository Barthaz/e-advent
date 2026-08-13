interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export default function LoadingSpinner({ size = 'md', className = '', label }: LoadingSpinnerProps) {
  const sizeClass = size === 'sm' ? 'spinner spinner-sm' : size === 'lg' ? 'spinner' : 'spinner';
  const containerSize = size === 'lg' ? 'py-16' : size === 'sm' ? 'py-4' : 'py-8';

  return (
    <div className={`flex flex-col items-center justify-center ${containerSize} ${className}`}>
      <div className={sizeClass} role="status" aria-label={label ?? 'Ładowanie...'} />
      {label && <p className="mt-3 text-sm text-parchment-muted">{label}</p>}
    </div>
  );
}
