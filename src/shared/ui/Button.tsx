// 앱에서 공통으로 쓰는 버튼 스타일을 제공합니다.
import type { ButtonHTMLAttributes } from "react";
import { cx } from "../../lib/cx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-moss text-white hover:bg-moss-hover",
  secondary: "border border-line bg-panel text-ink hover:bg-moss-soft",
  ghost: "text-muted hover:bg-moss-soft hover:text-ink",
  danger: "bg-coral text-white hover:bg-coral-hover",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export function Button({
  className,
  variant = "secondary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
