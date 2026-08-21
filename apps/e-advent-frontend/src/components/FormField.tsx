interface FormFieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  textarea?: boolean;
  rows?: number;
  helpText?: string;
  min?: number;
  max?: number;
  maxLength?: number;
  autoComplete?: string;
  name?: string;
  id?: string;
}

function cleanLabel(label: string): string {
  return label.replace(/\s*\*+\s*$/u, '').trimEnd();
}

export default function FormField({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  textarea = false,
  rows = 3,
  helpText,
  min,
  max,
  maxLength,
  autoComplete,
  name,
  id,
}: FormFieldProps) {
  const displayLabel = cleanLabel(label);
  const inputId = id || name;

  return (
    <div className="mb-4">
      <label htmlFor={inputId} className="block text-sm font-medium text-parchment-muted mb-2">
        {displayLabel}
        {required && <span className="text-christmas-red ml-1" aria-hidden="true">*</span>}
      </label>
      {textarea ? (
        <textarea
          id={inputId}
          name={name}
          value={value}
          onChange={(e) => {
            let newValue = e.target.value;
            if (maxLength !== undefined && newValue.length > maxLength) {
              newValue = newValue.slice(0, maxLength);
            }
            onChange(newValue);
          }}
          placeholder={placeholder}
          required={required}
          rows={rows}
          maxLength={maxLength}
          autoComplete={autoComplete}
          className="input-field"
        />
      ) : (
        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={(e) => {
            let newValue = e.target.value;
            if (maxLength !== undefined && newValue.length > maxLength) {
              newValue = newValue.slice(0, maxLength);
            }
            if (type === 'number' && (min !== undefined || max !== undefined)) {
              const numValue = parseFloat(newValue);
              if (newValue !== '' && !isNaN(numValue)) {
                if (min !== undefined && numValue < min) {
                  newValue = min.toString();
                } else if (max !== undefined && numValue > max) {
                  newValue = max.toString();
                }
              }
            }
            onChange(newValue);
          }}
          placeholder={placeholder}
          required={required}
          min={min}
          max={max}
          maxLength={maxLength}
          autoComplete={autoComplete}
          className="input-field"
        />
      )}
      {helpText && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
      {maxLength !== undefined && (
        <p className="mt-1 text-xs text-gray-500 text-right">
          {value.length}/{maxLength} znaków
        </p>
      )}
    </div>
  );
}
