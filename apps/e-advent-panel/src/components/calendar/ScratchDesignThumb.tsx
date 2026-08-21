interface ScratchDesignThumbProps {
  imageSrc: string;
  alt?: string;
  className?: string;
}

/** Design background + scratch template overlay (panel-local assets). */
export default function ScratchDesignThumb({
  imageSrc,
  alt = 'Podgląd designu zdrapki',
  className = '',
}: ScratchDesignThumbProps) {
  return (
    <div className={`relative overflow-hidden bg-black aspect-[2/3] max-w-xs mx-auto ${className}`}>
      <img
        src={imageSrc}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <img
        src="/scratch/template.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-fill"
      />
    </div>
  );
}
