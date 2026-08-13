import { useEffect, useState } from 'react';

interface Snowflake {
  id: number;
  left: number;
  animationDuration: number;
  size: number;
  opacity: number;
  delay: number;
  drift: number;
}

export default function Snowfall() {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);

  useEffect(() => {
    // Generuj płatki dla ciągłego, równomiernego efektu
    const flakes: Snowflake[] = [];
    const numberOfFlakes = 60;
    
    for (let i = 0; i < numberOfFlakes; i++) {
      flakes.push({
        id: i,
        left: Math.random() * 100,
        animationDuration: 10 + Math.random() * 15, // 10-25 sekund na spadek
        size: 8 + Math.random() * 12,
        opacity: 0.5 + Math.random() * 0.5,
        delay: Math.random() * 20, // Różne opóźnienia dla ciągłego strumienia
        drift: (Math.random() - 0.5) * 50, // Kołysanie boczne
      });
    }
    setSnowflakes(flakes);
  }, []);

  return (
    <>
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {snowflakes.map((flake) => {
          // Oblicz transformację dla końca animacji
          const finalX = flake.drift;
          const midX = flake.drift * 0.5;
          const startOpacity = flake.opacity;
          const midOpacity = flake.opacity * 0.8;
          const endOpacity = flake.opacity * 0.2;
          
          return (
            <div
              key={flake.id}
              className="absolute text-white"
              style={{
                left: `${flake.left}%`,
                top: '-30px',
                fontSize: `${flake.size}px`,
                animation: `snowfall ${flake.animationDuration}s linear infinite`,
                animationDelay: `${flake.delay}s`,
                '--start-x': '0px',
                '--mid-x': `${midX}px`,
                '--end-x': `${finalX}px`,
                '--start-opacity': startOpacity,
                '--mid-opacity': midOpacity,
                '--end-opacity': endOpacity,
              } as React.CSSProperties}
            >
              ❄
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes snowfall {
          0% {
            transform: translateY(-30px) translateX(var(--start-x, 0px)) rotate(0deg);
            opacity: var(--start-opacity, 1);
          }
          50% {
            transform: translateY(50vh) translateX(var(--mid-x, 0px)) rotate(180deg);
            opacity: var(--mid-opacity, 0.8);
          }
          100% {
            transform: translateY(calc(100vh + 30px)) translateX(var(--end-x, 0px)) rotate(360deg);
            opacity: var(--end-opacity, 0.2);
          }
        }
      `}</style>
    </>
  );
}
