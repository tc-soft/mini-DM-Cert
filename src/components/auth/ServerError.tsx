import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServerErrorProps {
  message?: string | null;
  // When true, always renders the banner's slot (invisible if there's no message) so
  // surrounding elements keep a fixed position instead of shifting when an error appears.
  reserveSpace?: boolean;
}

export function ServerError({ message, reserveSpace = false }: ServerErrorProps) {
  if (!message && !reserveSpace) return null;

  return (
    <p
      className={cn(
        "flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-900/30 px-3 py-1.5 text-xs text-red-300",
        !message && "invisible",
      )}
    >
      <CircleAlert className="size-3.5 shrink-0" />
      {message ?? "placeholder"}
    </p>
  );
}
