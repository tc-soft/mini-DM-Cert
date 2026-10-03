import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export const inputClass =
  "w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/40 focus:ring-2 focus:ring-purple-400 focus:outline-none transition-colors";

export function Field({ id, label, required, error, hint, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm text-blue-100/80">
        {label}
        {required ? <span className="text-purple-300"> *</span> : null}
      </label>
      {children}
      {/* Fixed-height slot, always rendered, so a field's error appearing doesn't shift
          the rest of the form — the space is reserved whether or not there's a message. */}
      <p
        className={cn("mt-1 flex min-h-[1rem] items-center gap-1 text-xs", error ? "text-red-300" : "text-blue-100/40")}
      >
        {error ? (
          <>
            <CircleAlert className="size-3 shrink-0" />
            {error}
          </>
        ) : (
          (hint ?? " ")
        )}
      </p>
    </div>
  );
}
