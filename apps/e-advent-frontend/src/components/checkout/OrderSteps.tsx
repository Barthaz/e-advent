import { Link } from 'react-router-dom';

export default function OrderSteps({ step, interactive = false }: { step: 1 | 2; interactive?: boolean }) {
  return <nav className="order-steps" aria-label="Etapy zamówienia"><ol>
    <li aria-current={step === 1 ? 'step' : undefined}><Link to={interactive ? '/podglad' : '/koszyk'}><span>{step === 2 ? '✓' : '1'}</span>{interactive ? 'Twój kalendarz' : 'Koszyk i e-mail'}</Link></li>
    <li aria-current={step === 2 ? 'step' : undefined}><span>2</span>Dostawa i płatność</li>
  </ol></nav>;
}
