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
}: FormFieldProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-parchment-muted mb-2">
        {label}
        {required && <span className="text-christmas-red ml-1">*</span>}
      </label>
      {textarea ? (
        <textarea
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
          className="input-field"
        />
      ) : (
        <input
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
