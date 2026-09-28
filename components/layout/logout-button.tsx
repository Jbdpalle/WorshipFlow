"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function LogoutButton({ className, showLabel }: { className?: string; showLabel?: boolean }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      className={cn(
        "flex items-center gap-1.5 rounded-lg p-2 text-muted-foreground hover:bg-surface-muted hover:text-foreground",
        className,
      )}
      title="Log out"
    >
      <LogOut className="h-4 w-4" />
      {showLabel && <span>Log out</span>}
    </button>
  );
}
