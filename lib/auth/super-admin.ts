// The two accounts trusted to manage beta/plan entitlement across every
// team, independent of their own church membership or role. This is a
// deliberate, narrow break from normal tenant isolation for exactly these
// two people — nothing else should ever check this. See lib/plans/limits.ts
// for what beta entitlement currently means, and lib/actions/plan.ts for
// the one action gated by it.
const SUPER_ADMIN_EMAILS = ["leader@worshipflow.app", "jbdpalle@gmail.com"];

export function isSuperAdmin(email: string): boolean {
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}
