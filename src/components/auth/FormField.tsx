import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const inputBase =
  "w-full rounded-lg bg-white/10 border px-3 py-2 pl-10 text-white placeholder-white/40 focus:outline-none focus:ring-2 transition-colors";

interface FormFieldProps {
  id: string;
  name?: string;
  label: string;
  type?: string;
  autoComplete?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  hint?: ReactNode;
  icon: ReactNode;
  endContent?: ReactNode;
}

export function FormField({
  id,
  name,
  label,
  type = "text",
  autoComplete,
  value,
  onChange,
  placeholder,
  error,
  hint,
  icon,
  endContent,
}: FormFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm text-blue-100/80">
        {label}
      </label>
      <div className="relative">
        <span className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40">{icon}</span>
        <input
          id={id}
          name={name ?? id}
          type={type}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            inputBase,
            error
              ? "border-red-400/60 focus:border-red-400 focus:ring-red-400/25"
              : "border-white/20 focus:border-purple-400 focus:ring-purple-400/25",
          )}
        />
        {endContent}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1 flex items-center gap-1 text-xs text-red-300">
          <CircleAlert className="size-3" />
          {error}
        </p>
      ) : (
        hint
      )}
    </div>
  );
}
