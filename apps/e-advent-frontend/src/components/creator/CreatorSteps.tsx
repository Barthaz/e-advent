export default function CreatorSteps({ labels, current }: { labels: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center justify-center gap-2 mb-6" aria-label="Kroki kreatora">
      {labels.map((label, index) => (
        <li key={label} className="flex items-center gap-2">
          <span aria-current={index === current ? "step" : undefined} className={
            "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm " +
            (index === current ? "bg-christmas-gold text-christmas-green font-semibold" : index < current ? "bg-white/20 text-white" : "bg-white/10 text-white/60")
          }>
            <span className="font-semibold">{index + 1}</span> {label}
          </span>
          {index < labels.length - 1 && <span className="hidden sm:inline-block w-6 h-px bg-white/30" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}
