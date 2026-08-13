import scratchTemplate from '../assets/scratch/template.png';

interface ScratchDesignPreviewProps {
  imageSrc: string;
  alt: string;
  className?: string;
  /** Aspect ratio of the frame; default matches product cards */
  aspectClassName?: string;
}

/**
 * Design image with scratch calendar template overlay (logo, windows, quote).
 */
export default function ScratchDesignPreview({
  imageSrc,
  alt,
  className = '',
  aspectClassName = 'aspect-[3/4]',
}: ScratchDesignPreviewProps) {
  return (
    <div className={`relative overflow-hidden bg-black ${aspectClassName} ${className}`}>
      <img
        src={imageSrc}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <img
        src={scratchTemplate}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-fill"
      />
    </div>
  );
}
