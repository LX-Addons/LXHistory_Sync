interface CheckboxFieldProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export default function CheckboxField({ id, label, checked, onChange, className, disabled }: CheckboxFieldProps) {
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}:</label>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={className}
        disabled={disabled}
      />
    </div>
  );
}