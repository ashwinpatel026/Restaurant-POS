import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserAccessInfo,
  getSelectedStoreCode,
  canAccessStore,
} from "@/lib/auth/accessControl";
import { prisma } from "@/lib/database";
import {
  findDuplicateTender,
  findTenderById,
  serializeTender,
  updateTender,
} from "@/lib/tenderType";

const TENDER_TYPES = ["Cash", "Card", "Gift Card", "External Pay"] as const;

function parseTenderPayload(body: Record<string, unknown>) {
  const tenderName = String(body.tenderName || "").trim();
  const tenderType = String(body.tenderType || "").trim() || "Cash";
  const displayOrder = Number.parseInt(String(body.displayOrder ?? "0"), 10);
  const preAuthAmount = Number(body.preAuthAmount ?? 0);
  const surchargePer = Number(body.surchargePer ?? 0);

  return {
    tenderName,
    tenderType: TENDER_TYPES.includes(
      tenderType as (typeof TENDER_TYPES)[number],
    )
      ? tenderType
      : "Cash",
    deviceSelectionCode: String(body.deviceSelectionCode || "").trim() || null,
    cashDrawerCode: String(body.cashDrawerCode || "").trim() || null,
    isActive: body.isActive !== false,
    displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
    externalPayCode:
      tenderType === "External Pay"
        ? String(body.externalPayCode || "").trim() || null
        : null,
    requiresDevice: body.requiresDevice === true,
    allowTip: body.allowTip === true,
    feeCode: String(body.feeCode || "").trim() || null,
    surchargePer: Number.isFinite(surchargePer) ? surchargePer : 0,
    preAuthAmount: Number.isFinite(preAuthAmount) ? preAuthAmount : 0,
    preAuthAllow: body.preAuthAllow === true,
    signatureAllow: body.signatureAllow === true,
    taxExempt: body.taxExempt === true,
  };
}

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
    const tenderTypeId = BigInt(resolvedParams.id);
    const existing = await findTenderById(tenderTypeId);

    if (!existing || existing.storeCode !== selectedStoreCode) {
      return NextResponse.json({ error: "Tender not found" }, { status: 404 });
    }

    const body = await request.json();
    const payload = parseTenderPayload({
      ...existing,
      ...body,
    });

    if (!payload.tenderName) {
      return NextResponse.json(
        { error: "Tender name is required" },
        { status: 400 },
      );
    }

    const duplicate = await findDuplicateTender({
      storeCode: selectedStoreCode,
      stationCode: existing.stationCode,
      tenderName: payload.tenderName,
      excludeId: tenderTypeId,
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "Tender with this name already exists for this station" },
        { status: 400 },
      );
    }

    const userId = parseInt(session.user.id, 10) || undefined;
    const updated = await updateTender(tenderTypeId, {
      ...payload,
      updatedBy: userId,
    });

    return NextResponse.json({ tender: serializeTender(updated) });
  } catch (error) {
    console.error("Error updating tender:", error);
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
    const tenderTypeId = BigInt(resolvedParams.id);
    const existing = await findTenderById(tenderTypeId);

    if (!existing) {
      return NextResponse.json({ error: "Tender not found" }, { status: 404 });
    }

    if (existing.storeCode && !canAccessStore(accessInfo, existing.storeCode)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userId = parseInt(session.user.id, 10) || undefined;
    const delegate = (prisma as any).tenderType;
    if (delegate) {
      await delegate.update({
        where: { tenderTypeId },
        data: {
          isDelete: true,
          isActive: false,
          updatedBy: userId,
          updatedOn: new Date(),
          syncSource: "location",
        },
      });
    } else {
      await prisma.$executeRawUnsafe(
        `UPDATE tbl_tender_type
         SET is_delete = true,
             is_active = false,
             updatedby = $2,
             updatedon = CURRENT_TIMESTAMP,
             sync_source = 'location'
         WHERE tender_type_id = $1`,
        tenderTypeId,
        userId ?? null,
      );
    }

    return NextResponse.json({ message: "Tender deleted successfully" });
  } catch (error) {
    console.error("Error deleting tender:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
