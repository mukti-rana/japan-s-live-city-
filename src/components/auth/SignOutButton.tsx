"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Signs out in the browser (rather than through a server action) so the
// top bar and saved items react immediately instead of waiting for a reload.
export default function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="flex items-center gap-2 rounded-xl border border-glass-border bg-glass-bg px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-sakura/30"
    >
      <LogOut size={15} />
      Sign out
    </button>
  );
}
