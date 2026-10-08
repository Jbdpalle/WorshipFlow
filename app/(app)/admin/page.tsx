import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { listAllTeamsForAdmin } from "@/lib/actions/plan";
import { SectionHeader } from "@/components/ui/section-header";
import { AdminTeamPlanTable } from "@/components/admin/admin-team-plan-table";

// Not linked from any nav — the two accounts in lib/auth/super-admin.ts
// know this URL. Gated the same way every tenant-scoped page in this app
// checks ownership (notFound() rather than a visible "not authorized"
// page), so its existence isn't advertised to anyone else either.
export default async function AdminPage() {
  const { user } = await requireUser();
  if (!isSuperAdmin(user.email)) notFound();

  const result = await listAllTeamsForAdmin();
  const teams = result.ok ? result.data : [];

  return (
    <div className="space-y-6">
      <SectionHeader
        level={1}
        label="Admin"
        title="Plan administration"
        description="Beta is running with every team unrestricted (see BETA_ALL_TEAMS_UNRESTRICTED in lib/plans/limits.ts), so changing a plan here has no effect on anyone's limits yet. This only sets the field ahead of when pricing goes live."
      />
      <AdminTeamPlanTable teams={teams} />
    </div>
  );
}
