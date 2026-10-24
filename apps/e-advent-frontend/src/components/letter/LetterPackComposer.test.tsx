import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import LetterPackComposer from './LetterPackComposer';

afterEach(cleanup);

function Harness() {
  const [letterQty, setLetterQty] = useState(1);
  const [certNames, setCertNames] = useState<string[]>([]);
  return (
    <LetterPackComposer
      letterQty={letterQty}
      onLetterQtyChange={setLetterQty}
      certNames={certNames}
      onCertNamesChange={setCertNames}
      letterPrice={29}
      certificatePrice={9}
      error={null}
    />
  );
}

it('composes three letters and two named certificates in one pack', () => {
  render(<Harness />);

  fireEvent.click(screen.getByLabelText('Więcej zestawów'));
  fireEvent.click(screen.getByLabelText('Więcej zestawów'));
  fireEvent.click(screen.getByRole('button', { name: 'Dodaj certyfikat z imieniem' }));
  fireEvent.click(screen.getByRole('button', { name: 'Dodaj kolejne imię' }));

  const inputs = screen.getAllByPlaceholderText('Imię dziecka');
  expect(inputs).toHaveLength(2);
  fireEvent.change(inputs[0], { target: { value: 'Kasia' } });
  fireEvent.change(inputs[1], { target: { value: 'Jan' } });

  expect(screen.getByText(/3 zestawy/)).toBeTruthy();
  expect(screen.getByText(/2 certyfikaty/)).toBeTruthy();
  expect(screen.getByText('105 zł')).toBeTruthy();
  expect(screen.getByText(/dostawa InPost jest już darmowa/)).toBeTruthy();
});

it('shows promotional letter and certificate prices with catalog compare-at', () => {
  function PromoHarness() {
    const [letterQty, setLetterQty] = useState(1);
    const [certNames, setCertNames] = useState<string[]>(['Kasia']);
    return (
      <LetterPackComposer
        letterQty={letterQty}
        onLetterQtyChange={setLetterQty}
        certNames={certNames}
        onCertNamesChange={setCertNames}
        letterPrice={23.2}
        certificatePrice={7.2}
        letterCompareAt={29}
        certificateCompareAt={9}
        error={null}
      />
    );
  }

  render(<PromoHarness />);
  expect(screen.getByText('9 zł')).toBeTruthy();
  expect(screen.getByText(/7.20 zł za dziecko/)).toBeTruthy();
  expect(screen.getByText('30.40 zł')).toBeTruthy();
});
