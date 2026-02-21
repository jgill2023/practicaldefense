import { db } from "./db";
import { blobAclPolicies } from "../shared/schema";
import { eq } from "drizzle-orm";

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
  blobUrl: string;
}

export async function setObjectAclPolicy(
  pathname: string,
  aclPolicy: ObjectAclPolicy,
): Promise<void> {
  await db
    .insert(blobAclPolicies)
    .values({
      pathname,
      ownerId: aclPolicy.owner,
      visibility: aclPolicy.visibility,
      blobUrl: aclPolicy.blobUrl,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: blobAclPolicies.pathname,
      set: {
        ownerId: aclPolicy.owner,
        visibility: aclPolicy.visibility,
        blobUrl: aclPolicy.blobUrl,
        updatedAt: new Date(),
      },
    });
}

export async function getObjectAclPolicy(
  pathname: string,
): Promise<ObjectAclPolicy | null> {
  const rows = await db
    .select()
    .from(blobAclPolicies)
    .where(eq(blobAclPolicies.pathname, pathname))
    .limit(1);

  if (rows.length === 0) return null;
  return {
    owner: rows[0].ownerId,
    visibility: rows[0].visibility as "public" | "private",
    blobUrl: rows[0].blobUrl,
  };
}

export async function deleteObjectAclPolicy(
  pathname: string,
): Promise<void> {
  await db.delete(blobAclPolicies).where(eq(blobAclPolicies.pathname, pathname));
}

export async function canAccessObject({
  userId,
  pathname,
  requestedPermission,
}: {
  userId?: string;
  pathname: string;
  requestedPermission: ObjectPermission;
}): Promise<boolean> {
  const aclPolicy = await getObjectAclPolicy(pathname);
  if (!aclPolicy) return false;

  // Public objects are always accessible for read
  if (
    aclPolicy.visibility === "public" &&
    requestedPermission === ObjectPermission.READ
  ) {
    return true;
  }

  // Access control requires user id
  if (!userId) return false;

  // Owner can always access
  if (aclPolicy.owner === userId) return true;

  return false;
}
