import React, { useState } from "react";
import { UserRound, Lock, LogIn } from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { PasswordToggle } from "@/components/auth/PasswordToggle";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { ServerError } from "@/components/auth/ServerError";

interface Props {
  serverError?: string | null;
}

interface FieldErrors {
  username?: string;
  password?: string;
}

export default function SignInForm({ serverError }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverErrorDismissed, setServerErrorDismissed] = useState(false);

  function validate() {
    const next: FieldErrors = {};

    if (!username.trim()) {
      next.username = "Login jest wymagany";
    }
    if (!password) {
      next.password = "Hasło jest wymagane";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function clearError(field: keyof FieldErrors) {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    // Po nowej probie nie pokazujemy bledu z poprzedniego logowania.
    setServerErrorDismissed(true);

    if (!validate()) {
      e.preventDefault();
    }
  }

  // Blad serwera pokazujemy po powrocie na strone, ale nie razem z
  // lokalnymi bledami walidacji ani po rozpoczeciu nowej proby.
  const visibleServerError = serverErrorDismissed || errors.username || errors.password ? null : serverError;

  return (
    <form method="POST" action="/api/auth/signin" className="space-y-5" onSubmit={handleSubmit} noValidate>
      {/* Stale miejsce na pole, a komunikat walidacji miesci sie w odstepie ponizej. */}
      <div className="h-[68px]">
        <FormField
          id="username"
          label="Login"
          autoComplete="off"
          value={username}
          onChange={(v) => {
            setUsername(v);
            clearError("username");
            setServerErrorDismissed(true);
          }}
          placeholder="login"
          error={errors.username}
          icon={<UserRound className="size-4" />}
        />
      </div>

      <div className="h-[68px]">
        <FormField
          id="password"
          label="Hasło"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          value={password}
          onChange={(v) => {
            setPassword(v);
            clearError("password");
            setServerErrorDismissed(true);
          }}
          placeholder="hasło"
          error={errors.password}
          icon={<Lock className="size-4" />}
          endContent={
            <PasswordToggle
              visible={showPassword}
              onToggle={() => {
                setShowPassword(!showPassword);
              }}
            />
          }
        />
      </div>

      {/* Rezerwacja wysokosci rowniez wtedy, gdy komunikat jest ukryty. */}
      <div className="h-8">
        <ServerError message={visibleServerError} reserveSpace />
      </div>

      <SubmitButton pendingText="Logowanie…" icon={<LogIn className="size-4" />}>
        Zaloguj się
      </SubmitButton>
    </form>
  );
}
