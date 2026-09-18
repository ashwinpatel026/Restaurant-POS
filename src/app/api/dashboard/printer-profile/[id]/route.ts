import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserAccessInfo,
  getSelectedStoreCode,
  canAccessStore,
  checkLocationPermission,
} from "@/lib/auth/accessControl";
import { prisma } from "@/lib/database";

const PRINTER_TYPES = ["Receipt", "Prep-Zone", "Document"] as const;

function getDelegate(name: "printerProfile" | "stationProfileSetting") {
  const delegate = (prisma as any)[name];
  if (!delegate) {
    throw new Error(
      `Prisma ${name} model is unavailable. Restart the dev server after prisma generate.`,
    );
  }
  return delegate;
}

function serializeProfile(profile: any) {
  return {
    ...profile,
    profileId: profile.profileId?.toString?.() ?? String(profile.profileId),
    createdBy: profile.createdBy ?? null,
    updatedBy: profile.updatedBy ?? null,
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await checkLocationPermission(session.user.role, "printers.update"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id, 10));
    const selectedStoreCode = getSelectedStoreCode(
      accessInfo,
      request.nextUrl.searchParams.get("storeCode"),
    );

    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: "No accessible store selected" },
        { status: 403 },
      );
    }

    const resolvedParams = await params;
    const profileId = BigInt(resolvedParams.id);
    const existing = await getDelegate("printerProfile").findFirst({
      where: { profileId, isDelete: false },
    });

    if (!existing || existing.storeCode !== selectedStoreCode) {
      return NextResponse.json(
        { error: "Printer profile not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const name = String(body.name || "").trim();
    const printerType = String(body.printerType || "").trim();
    const isActive = body.isActive !== false;

    if (!name) {
      return NextResponse.json(
        { error: "Profile name is required" },
        { status: 400 },
      );
    }

    if (!PRINTER_TYPES.includes(printerType as (typeof PRINTER_TYPES)[number])) {
      return NextResponse.json(
        { error: "Printer type is required" },
        { status: 400 },
      );
    }

    const duplicate = await getDelegate("printerProfile").findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        storeCode: selectedStoreCode,
        isDelete: false,
        NOT: { profileId },
      },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "Printer profile with this name already exists" },
        { status: 400 },
      );
    }

    const userId = parseInt(session.user.id, 10) || undefined;
    const updated = await getDelegate("printerProfile").update({
      where: { profileId },
      data: {
        name,
        printerType,
        isActive,
        updatedBy: userId,
        updatedOn: new Date(),
        isSyncToWeb: 0,
        isSyncToLocal: 0,
        syncSource: "location",
      },
    });

    return NextResponse.json({ profile: serializeProfile(updated) });
  } catch (error) {
    console.error("Error updating printer profile:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await checkLocationPermission(session.user.role, "printers.delete"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id, 10));
    const resolvedParams = await params;
    const profileId = BigInt(resolvedParams.id);
    const existing = await getDelegate("printerProfile").findFirst({
      where: { profileId, isDelete: false },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Printer profile not found" },
        { status: 404 },
      );
    }

    if (existing.storeCode && !canAccessStore(accessInfo, existing.storeCode)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userId = parseInt(session.user.id, 10) || undefined;
    await prisma.$transaction(async (tx) => {
      await (tx as any).printerProfile.update({
        where: { profileId },
        data: {
          isDelete: true,
          isActive: false,
          updatedBy: userId,
          updatedOn: new Date(),
          syncSource: "location",
        },
      });

      await (tx as any).stationProfileSetting.updateMany({
        where: {
          profileCode: existing.profileCode,
          storeCode: existing.storeCode,
          isDelete: false,
        },
        data: {
          isDelete: true,
          isActive: false,
          updatedBy: userId,
          updatedOn: new Date(),
          syncSource: "location",
        },
      });
    });

    return NextResponse.json({ message: "Printer profile deleted successfully" });
  } catch (error) {
    console.error("Error deleting printer profile:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
