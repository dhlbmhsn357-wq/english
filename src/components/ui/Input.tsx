import type { InputHTMLAttributes } from 'react';
import { useId } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

/** Input موحّد: Label + helper/error state + focus state — بدل الاعتماد على placeholder بس */
export function Input({ label, helperText, error, id, className, ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className={styles.field}>
      {label && <label className={styles.label} htmlFor={inputId}>{label}</label>}
      <input
        id={inputId}
        className={[styles.input, error ? styles.error : '', className || ''].join(' ').trim()}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
        {...rest}
      />
      {error ? (
        <span id={`${inputId}-error`} className={styles.errorText}>{error}</span>
      ) : helperText ? (
        <span id={`${inputId}-helper`} className={styles.helper}>{helperText}</span>
      ) : null}
    </div>
  );
}
