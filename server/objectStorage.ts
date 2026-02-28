import { put, del } from "@vercel/blob";
import { Response } from "express";
import { Readable } from "node:stream";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
  deleteObjectAclPolicy,
} from "./objectAcl";

export { ObjectAclPolicy, ObjectPermission };

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  // Upload a file buffer to Vercel Blob (server-side upload).
  async uploadObject(
    pathname: string,
    buffer: Buffer,
    contentType: string,
    access: "public" | "private" = "private",
  ): Promise<{ url: string; pathname: string }> {
    // Prevent path traversal attacks
    if (pathname.includes('..') || pathname.startsWith('/')) {
      throw new Error('Invalid pathname');
    }

    const blob = await put(pathname, buffer, {
      access,
      contentType,
      addRandomSuffix: false,
    });
    return { url: blob.url, pathname };
  }

  // Download an object and stream it to the Express response.
  async downloadObject(
    blobUrl: string,
    res: Response,
    cacheTtlSec: number = 3600,
  ): Promise<void> {
    try {
      const response = await fetch(blobUrl);
      if (!response.ok || !response.body) {
        if (!res.headersSent) {
          res.status(404).json({ error: "Object not found" });
        }
        return;
      }

      const contentType =
        response.headers.get("content-type") || "application/octet-stream";
      const contentLength = response.headers.get("content-length");

      res.set({
        "Content-Type": contentType,
        ...(contentLength ? { "Content-Length": contentLength } : {}),
        "Cache-Control": `private, max-age=${cacheTtlSec}`,
      });

      Readable.fromWeb(response.body as any).pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  // Upload a file and return the blob URL (for ObjectUploader flow).
  // Client POSTs file to Express, Express puts to Vercel Blob.
  async uploadEntityObject(
    buffer: Buffer,
    contentType: string,
    originalName?: string,
  ): Promise<{ url: string; pathname: string }> {
    const ext = originalName ? originalName.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, '') : "bin";
    const pathname = `uploads/${randomUUID()}.${ext}`;
    return this.uploadObject(pathname, buffer, contentType, "private");
  }

  // Set ACL policy on a blob by its pathname.
  async trySetObjectEntityAclPolicy(
    blobUrl: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    const pathname = this.extractPathname(blobUrl);
    await setObjectAclPolicy(pathname, { ...aclPolicy, blobUrl });
    return pathname;
  }

  // Check if user can access a blob by its pathname.
  async canAccessObjectEntity({
    userId,
    pathname,
    requestedPermission,
  }: {
    userId?: string;
    pathname: string;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      pathname,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }

  // Delete a blob and its ACL policy.
  async deleteObject(blobUrl: string): Promise<void> {
    await del(blobUrl);
    const pathname = this.extractPathname(blobUrl);
    await deleteObjectAclPolicy(pathname);
  }

  // Extract a pathname from a Vercel Blob URL for ACL lookups.
  private extractPathname(blobUrlOrPath: string): string {
    if (blobUrlOrPath.startsWith("http")) {
      try {
        const url = new URL(blobUrlOrPath);
        return url.pathname.slice(1); // remove leading /
      } catch {
        return blobUrlOrPath;
      }
    }
    return blobUrlOrPath;
  }
}
