import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserAccessInfo,
  getSelectedStoreCode,
  canAccessStore,
} from "@/lib/auth/accessControl";
import {
  findDuplicateExternalPay,
  findExternalPayById,
  serializeExternalPay,
  softDeleteExternalPay,
  updateExternalPay,
} from "@/lib/externalPayMaster";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const externalPayId = BigInt(resolvedParams.id);
    const existing = await findExternalPayById(externalPayId);

    if (!existing || existing.storeCode !== selectedStoreCode) {
      return NextResponse.json({ error: "Tender not found" }, { status: 404 });
    }

    const body = await request.json();
    const externalPayName = String(
      body.externalPayName ?? existing.externalPayName ?? "",
    ).trim();
    const isActive =
      body.isActive === undefined
        ? existing.isActive !== false
        : body.isActive !== false;

    if (!externalPayName) {
      return NextResponse.json(
        { error: "Tender name is required" },
        { status: 400 },
      );
    }

    const duplicate = await findDuplicateExternalPay({
      storeCode: selectedStoreCode,
      stationCode: existing.stationCode,
      externalPayName,
      excludeId: externalPayId,
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "Tender with this name already exists for this station" },
        { status: 400 },
      );
    }

    const userId = parseInt(session.user.id, 10) || undefined;
    const updated = await updateExternalPay(externalPayId, {
      externalPayName,
      isActive,
      updatedBy: userId,
    });

    return NextResponse.json({ tender: serializeExternalPay(updated) });
  } catch (error) {
    console.error("Error updating external pay master:", error);
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id, 10));
    const resolvedParams = await params;
    const externalPayId = BigInt(resolvedParams.id);
    const existing = await findExternalPayById(externalPayId);

    if (!existing) {
      return NextResponse.json({ error: "Tender not found" }, { status: 404 });
    }

    if (existing.storeCode && !canAccessStore(accessInfo, existing.storeCode)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userId = parseInt(session.user.id, 10) || undefined;
    await softDeleteExternalPay(externalPayId, userId);

    return NextResponse.json({ message: "Tender deleted successfully" });
  } catch (error) {
    console.error("Error deleting external pay master:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
