declare namespace App {
  interface Locals {
    user: import("@/lib/auth").SessionUser | null;
  }
}
