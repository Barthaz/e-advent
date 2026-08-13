import { getProduct, PHYSICAL_FULFILLMENT_NOTE } from '../../config/products';
import PriceBreakdown from '../PriceBreakdown';
import ScratchDesignPreview from '../ScratchDesignPreview';
import type { CalendarFormat, DesignSelection, ProductType } from '../../types/order';

interface StepSummaryProps {
  productType: ProductType;
  sku: string;
  name: string;
  email: string;
  calendarTitle: string;
  tasksCount?: number;
  format?: CalendarFormat;
  design?: DesignSelection | null;
}

const PRODUCT_META: Record<ProductType, { icon: string; tagline: string; note?: string }> = {
  interactive: {
    icon: 'fa-calendar-days',
    tagline: 'Spersonalizowany kalendarz online — odkrywaj zadania każdego dnia',
  },
  scratch: {
    icon: 'fa-hand-sparkles',
    tagline: 'Fizyczny kalendarz ze zdrapką — własna grafika i zadania pod każde okienko',
    note: PHYSICAL_FULFILLMENT_NOTE,
  },
  letter: {
    icon: 'fa-envelope',
    tagline: 'Gotowy zestaw listu do Świętego Mikołaja — listy, koperta i naklejki',
    note: PHYSICAL_FULFILLMENT_NOTE,
  },
}

export default function StepSummary({
  productType,
  sku,
  name,
  email,
  calendarTitle,
  tasksCount,
  format,
  design,
}: StepSummaryProps) {
  const product = getProduct(sku);
  const meta = PRODUCT_META[productType];

  const productLabel =
    productType === 'interactive' ? 'Kalendarz interaktywny' :
    'Kalendarz zdrapka';

  const tasksLabel =
    tasksCount === undefined ? null :
    tasksCount === 0 ? 'Z zestawów predefiniowanych' :
    `${tasksCount} własnych + losowanie z zestawów`;

  return (
    <section className="creator-summary">
      <div className="creator-summary-hero">
        <div className="creator-summary-hero-icon">
          <i className={`fas ${meta.icon}`} />
        </div>
        <h2 className="creator-summary-title">Prawie gotowe!</h2>
        <p className="creator-summary-subtitle">{meta.tagline}</p>
      </div>

      <div className="creator-summary-grid">
        <div className="creator-summary-card">
          <h3 className="creator-summary-card-title">
            <i className="fas fa-gift" />
            Produkt
          </h3>
          <div className="creator-summary-row">
            <span className="creator-summary-label">Wariant</span>
            <span className="creator-summary-value">{productLabel}</span>
          </div>
          <div className="creator-summary-row">
            <span className="creator-summary-label">Tytuł kalendarza</span>
            <span className="creator-summary-value">{calendarTitle}</span>
          </div>
          {format && (
            <div className="creator-summary-row">
              <span className="creator-summary-label">Format</span>
              <span className="creator-summary-value">{format}</span>
            </div>
          )}
          {tasksLabel && (
            <div className="creator-summary-row">
              <span className="creator-summary-label">Zadania</span>
              <span className="creator-summary-value">{tasksLabel}</span>
            </div>
          )}
          <span className="creator-summary-product-badge">
            <i className={`fas ${meta.icon}`} />
            {productType === 'interactive' ? 'Online' : 'Produkt fizyczny'}
          </span>
        </div>

        <div className="creator-summary-card">
          <h3 className="creator-summary-card-title">
            <i className="fas fa-user" />
            Twoje dane
          </h3>
          <div className="creator-summary-row">
            <span className="creator-summary-label">Imię</span>
            <span className="creator-summary-value">{name}</span>
          </div>
          <div className="creator-summary-row">
            <span className="creator-summary-label">Email</span>
            <span className="creator-summary-value">{email}</span>
          </div>
        </div>
      </div>

      {design?.imageUrl && (
        <div className="creator-summary-card creator-summary-design-card">
          <h3 className="creator-summary-card-title">
            <i className="fas fa-image" />
            Wybrana grafika
          </h3>
          <div className="creator-summary-design-frame">
            <ScratchDesignPreview
              imageSrc={design.imageUrl}
              alt="Wybrana grafika kalendarza"
              aspectClassName="aspect-[3/4]"
              className="w-full"
            />
          </div>
        </div>
      )}

      {product && (
        <div className="creator-summary-price">
          {productType === 'scratch' || productType === 'letter' ? (
            <PriceBreakdown
              basePrice={product.basePrice}
              shippingCost={0}
              variant="panel"
              totalLabel="Cena produktu"
              productLabel="Produkt"
            />
          ) : (
            <PriceBreakdown
              basePrice={product.basePrice}
              shippingCost={product.shippingCost}
              variant="panel"
              totalLabel="Do zapłaty"
            />
          )}
        </div>
      )}

      {meta.note && (
        <p className="creator-summary-note">
          <i className="fas fa-truck" />
          <span>{meta.note}</span>
        </p>
      )}
    </section>
  );
}
