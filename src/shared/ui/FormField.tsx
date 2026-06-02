// 입력 라벨과 오류 메시지를 일관되게 배치합니다.
import type { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  children: ReactNode;
  error?: string;
};

export function FormField({ label, children, error }: FormFieldProps) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-ink">{label}</span>
      {children}
      {error ? <span className="text-xs text-coral">{error}</span> : null}
    </label>
  );
}
