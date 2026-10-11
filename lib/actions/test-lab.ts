"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { findTestLabChurch, TEST_LAB_CHURCH_NAME, TEST_LAB_TEAM_NAME } from "@/lib/auth/test-lab";
import { runAction, type ActionResult, type ActionResultData } from "@/lib/actions/action-result";
import { createTestSet as buildTestSet, clearTestData } from "@/lib/songs/test-lab-data";

const NOT_ALLOWED = "The Test Lab is only available to the WorshipFlow owner accounts.";

// Every action here re-checks the caller's email server-side; hiding the
// button is never the protection.
async function requireSuperAdmin() {
  const ctx = await requireUser();
  if (!isSuperAdmin(ctx.user.email)) return null;
  return ctx;
}

// Switches this account into the shared Test Lab church, creating it the
// first time. The lab holds only test data; nobody outside the two super
// admins ever gets a Membership on it (see createInvite, which refuses).
export async function enterTestLab(): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSuperAdmin();
    if (!ctx) return { ok: false, error: NOT_ALLOWED };
    const { user } = ctx;

    let lab = await findTestLabChurch();
    if (!lab) {
      const created = await prisma.church.create({ data: { name: TEST_LAB_CHURCH_NAME, ownerId: user.id } });
      await prisma.team.create({ data: { name: TEST_LAB_TEAM_NAME, ownerId: user.id, churchId: created.id } });
      lab = await findTestLabChurch();
      if (!lab) return { ok: false, error: "Couldn't create the Test Lab." };
    }

    const membership = await prisma.membership.findUnique({
      where: { userId_churchId: { userId: user.id, churchId: lab.id } },
    });
    if (!membership) {
      await prisma.membership.create({ data: { userId: user.id, churchId: lab.id, role: "OWNER" } });
    }
    await prisma.user.update({ where: { id: user.id }, data: { currentChurchId: lab.id } });
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

export async function leaveTestLab(): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await requireSuperAdmin();
    if (!ctx) return { ok: false, error: NOT_ALLOWED };
    const lab = await findTestLabChurch();
    const home = await prisma.membership.findFirst({
      where: { userId: ctx.user.id, ...(lab ? { churchId: { not: lab.id } } : {}) },
      orderBy: { createdAt: "asc" },
    });
    await prisma.user.update({ where: { id: ctx.user.id }, data: { currentChurchId: home?.churchId ?? null } });
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

async function requireInsideLab() {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { ok: false, error: NOT_ALLOWED } as const;
  const lab = await findTestLabChurch();
  if (!lab || lab.id !== ctx.church.id) return { ok: false, error: "Switch into the Test Lab first." } as const;
  return { ok: true, ctx } as const;
}

// Builds `count` ready-to-use test sets (4 songs with layered arrangements,
// a roster-only test band, vision, assignments) in the Test Lab team only.
export async function createTestSets(count = 1): Promise<ActionResultData<{ ids: string[] }>> {
  return runAction(async () => {
    const gate = await requireInsideLab();
    if (!gate.ok) return { ok: false, error: gate.error };
    const n = Math.min(5, Math.max(1, Math.floor(count)));
    const ids: string[] = [];
    for (let i = 0; i < n; i++) ids.push((await buildTestSet(gate.ctx.team.id)).id);
    revalidatePath("/sets");
    revalidatePath("/dashboard");
    return { ok: true, data: { ids } };
  });
}

export async function resetTestLab(): Promise<ActionResult> {
  return runAction(async () => {
    const gate = await requireInsideLab();
    if (!gate.ok) return { ok: false, error: gate.error };
    await clearTestData(gate.ctx.team.id);
    revalidatePath("/", "layout");
    return { ok: true };
  });
}
