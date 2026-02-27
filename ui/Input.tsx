import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({
  label,
  error,
  className = "",
  ...props
}: InputProps) {
  return (
    <div className="mb-3">
      {label && <label className="form-label">{label}</label>}
      <input
        className={`form-control ${error ? "is-invalid" : ""} ${className}`.trim()}
        {...props}
      />
      {error && <div className="invalid-feedback">{error}</div>}
    </div>
  );
}
