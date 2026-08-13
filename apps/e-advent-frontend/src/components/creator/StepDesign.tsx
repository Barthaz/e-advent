import { useState, useRef } from 'react';
import presetDesignsData from '../../data/presetDesigns.json';
import { createCalendar, uploadDesignImage, type InternalCalendarData } from '../../api/api';
import type { CalendarFormat, DesignSelection, ProductType } from '../../types/order';
import PriceBreakdown from '../PriceBreakdown';
import { getProduct, getSkuForTypeAndFormat, PHYSICAL_FULFILLMENT_TIME } from '../../config/products';
import ScratchDesignPreview from '../ScratchDesignPreview';
import {
  getPendingCalendarSession,
  setPendingCalendarSession,
  loadFormData,
} from '../../utils/creatorStorage';

interface PresetDesign {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  imageUrl: string;
  productTypes: string[];
}

interface StepDesignProps {
  productType: ProductType;
  format: CalendarFormat;
  setFormat: (f: CalendarFormat) => void;
  design: DesignSelection | null;
  setDesign: (d: DesignSelection) => void;
  validationError: string | null;
  setValidationError: (e: string | null) => void;
}

async function ensurePendingDraft(productType: ProductType): Promise<{ calendarId: string; editToken: string }> {
  const existing = getPendingCalendarSession();
  if (existing) return existing;

  const form = loadFormData(productType);
  const draft: InternalCalendarData = {
    name: form.name || 'Draft',
    email: form.email || 'draft@e-advent.pl',
    calendarTitle: form.calendarTitle || 'Draft calendar',
    tasks: [],
    dates: [],
    productType,
    sku: getSkuForTypeAndFormat(productType, 'A4') || 'scratch-a4',
  };
  const created = await createCalendar(draft);
  if (!created.editToken) {
    throw new Error('Brak tokena edycji z serwera');
  }
  setPendingCalendarSession(created.calendar.id, created.editToken);
  return { calendarId: created.calendar.id, editToken: created.editToken };
}

export default function StepDesign({
  productType,
  format,
  setFormat,
  design,
  setDesign,
  validationError,
  setValidationError,
}: StepDesignProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const presets = (presetDesignsData as PresetDesign[]).filter((p) =>
    p.productTypes.includes(productType)
  );

  const sku = getSkuForTypeAndFormat(productType, format);
  const product = sku ? getProduct(sku) : null;

  const handleFileUpload = async (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setValidationError('Dozwolone formaty: JPG, PNG, WEBP');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setValidationError('Maksymalny rozmiar pliku to 10 MB');
      return;
    }
    setUploading(true);
    setValidationError(null);
    try {
      const session = await ensurePendingDraft(productType);
      const result = await uploadDesignImage(file, session.calendarId, session.editToken);
      if (result.success && result.imageUrl) {
        setDesign({ source: 'custom', imageUrl: result.imageUrl, imageKey: result.imageKey });
      } else {
        setValidationError(result.error || 'Błąd uploadu');
      }
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Błąd uploadu grafiki');
    } finally {
      setUploading(false);
    }
  };

  const selectPreset = (preset: PresetDesign) => {
    setDesign({ source: 'preset', presetId: preset.id, imageUrl: preset.imageUrl });
    setValidationError(null);
  };

  return (
    <section className="creator-wizard-step">
      <h2 className="heading-section mb-4">Grafika i format</h2>

      <div className="mb-6">
        <h3 className="font-semibold text-parchment-text mb-3">Wybierz format</h3>
        <div className="grid grid-cols-2 gap-4">
          {(['A4', 'A3'] as CalendarFormat[]).map((f) => {
            const fSku = getSkuForTypeAndFormat(productType, f);
            const fProduct = fSku ? getProduct(fSku) : null;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={`format-option ${format === f ? 'format-option--selected' : ''}`}
              >
                <div className="format-option-label">{f}</div>
                {fProduct ? (
                  <PriceBreakdown
                    basePrice={fProduct.basePrice}
                    shippingCost={fProduct.shippingCost}
                    variant="format"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="font-semibold text-parchment-text mb-3">Wybierz grafikę</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => selectPreset(preset)}
              className={`rounded-lg border-2 overflow-hidden transition-all ${
                design?.presetId === preset.id ? 'border-christmas-gold ring-2 ring-christmas-gold' : 'border-parchment-dark/25 hover:border-christmas-green/50'
              }`}
            >
              <ScratchDesignPreview
                imageSrc={preset.thumbnailUrl}
                alt={preset.name}
                aspectClassName="aspect-[3/4]"
              />
              <div className="p-2 text-sm font-medium text-parchment-text">{preset.name}</div>
            </button>
          ))}
        </div>

        <div className="border-2 border-dashed border-parchment-dark/30 rounded-lg p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
          <p className="text-parchment-muted mb-3">Lub prześlij własną grafikę (JPG, PNG, max 10 MB)</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-outline-parchment px-6 py-2"
          >
            {uploading ? (
              <><i className="fas fa-spinner fa-spin mr-2" />Przesyłanie...</>
            ) : (
              <><i className="fas fa-upload mr-2" />Wybierz plik</>
            )}
          </button>
        </div>
      </div>

      {design?.imageUrl && (
        <div className="mb-4">
          <p className="text-sm text-parchment-muted mb-2">Wybrana grafika:</p>
          <ScratchDesignPreview
            imageSrc={design.imageUrl}
            alt="Podgląd grafiki"
            className="w-full max-w-xs mx-auto rounded-lg border border-parchment-dark/20"
            aspectClassName="aspect-[3/4]"
          />
        </div>
      )}

      {validationError && (
        <div className="alert-error"><p className="font-medium">{validationError}</p></div>
      )}

      {product && (
        <PriceBreakdown
          basePrice={product.basePrice}
          shippingCost={product.shippingCost}
          variant="inline"
          className="pt-4 border-t border-parchment-dark/15"
          totalLabel="Razem z wysyłką"
        />
      )}

      <p className="mt-4 text-sm text-parchment-muted">
        <i className="fas fa-clock mr-2 text-christmas-green" />
        Czas realizacji: {PHYSICAL_FULFILLMENT_TIME}
      </p>
    </section>
  );
}
