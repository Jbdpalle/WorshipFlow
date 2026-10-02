-- Relax SongRoleNote's unique constraint from (sectionId, role) to
-- (sectionId, role, teamMemberId) so two different people sharing a role
-- can each have their own individualized PERSON-scoped direction in the
-- same section. Safe: the old constraint was strictly narrower, so no
-- existing row can violate the new, broader one — Postgres also treats
-- NULL as distinct, so the single shared TEAM/ROLE-wide row per
-- (sectionId, role) keeps working exactly as before.
-- DropIndex
DROP INDEX "SongRoleNote_sectionId_role_key";

-- CreateIndex
CREATE UNIQUE INDEX "SongRoleNote_sectionId_role_teamMemberId_key" ON "SongRoleNote"("sectionId", "role", "teamMemberId");
