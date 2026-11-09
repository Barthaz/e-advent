import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import room from '../assets/home/christmas-room.webp';
import './calendar-experience.css';

export default function CalendarScene({ title, description, children, free = false }: { title: string; description: string; children: ReactNode; free?: boolean }) {
  return <div className="calendar-scene">
    <header className="calendar-scene-header">
      <img src={room} alt="" />
      <div><p className="calendar-eyebrow">{free ? 'Mały rytuał od e-Advent, bez zamówienia' : 'Wasz grudzień. Wasze małe tradycje.'}</p><h1>{title}</h1><p>{description}</p></div>
    </header>
    <div className="calendar-scene-content">
      <section className="calendar-board" aria-label="Twój kalendarz">{children}</section>
      <div className="calendar-scene-footer"><p>{free ? 'Masz własny kalendarz?' : 'Niech to będzie chwila tylko dla Was.'}</p><Link to={free ? '/kalendarz' : '/'}>{free ? 'Wpisz kod dostępu' : 'Wróć do e-Advent'} <i className="fas fa-arrow-right" aria-hidden="true" /></Link></div>
    </div>
  </div>;
}

export function CalendarProgress({ opened }: { opened: number }) {
  return <div className="calendar-progress"><span>Wasza grudniowa opowieść</span><strong>{opened} / 24 odkrytych chwil</strong><progress max={24} value={opened} aria-label="Liczba otwartych okienek" /></div>;
}
