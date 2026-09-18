import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserAccessInfo,
  getSelectedStoreCode,
  canAccessStore,
} from "@/lib/auth/accessControl";
import {
  findCashDrawerById,
  findDuplicateCashDrawer,
  normalizeConnectionType,
  serializeCashDrawer,
  softDeleteCashDrawer,
  updateCashDrawer,
} from "@/lib/cashDrawerMaster";

function parsePayload(body: Record<string, unknown>) {
  const connectionType = normalizeConnectionType(body.connectionType);
  return {
    cashDrawerName: String(body.cashDrawerName || "").trim(),
    comPort: String(body.comPort || "").trim() || null,
    connectionType,
    printerCode:
      connectionType === "Printer"
        ? String(body.printerCode || "").trim() || null
        : null,
    isActive: body.isActive !== false,
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
    const cashDrawerId = BigInt(resolvedParams.id);
    const existing = await findCashDrawerById(cashDrawerId);

    if (!existing || existing.storeCode !== selectedStoreCode) {
      return NextResponse.json(
        { error: "Cash drawer not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const payload = parsePayload({ ...existing, ...body });

    if (!payload.cashDrawerName) {
      return NextResponse.json(
        { error: "Cash drawer name is required" },
        { status: 400 },
      );
    }

    if (payload.connectionType === "Printer" && !payload.printerCode) {
      return NextResponse.json(
        { error: "Printer is required for Printer connection type" },
        { status: 400 },
      );
    }

    const duplicate = await findDuplicateCashDrawer({
      storeCode: selectedStoreCode,
      stationCode: existing.stationCode,
      cashDrawerName: payload.cashDrawerName,
      excludeId: cashDrawerId,
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "Cash drawer with this name already exists for this station" },
        { status: 400 },
      );
    }

    const userId = parseInt(session.user.id, 10) || undefined;
    const updated = await updateCashDrawer(cashDrawerId, {
      ...payload,
      updatedBy: userId,
    });

    return NextResponse.json({ drawer: serializeCashDrawer(updated) });
  } catch (error) {
    console.error("Error updating cash drawer:", error);
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
    const cashDrawerId = BigInt(resolvedParams.id);
    const existing = await findCashDrawerById(cashDrawerId);

    if (!existing) {
      return NextResponse.json(
        { error: "Cash drawer not found" },
        { status: 404 },
      );
    }

    if (existing.storeCode && !canAccessStore(accessInfo, existing.storeCode)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userId = parseInt(session.user.id, 10) || undefined;
    await softDeleteCashDrawer(cashDrawerId, userId);

    return NextResponse.json({ message: "Cash drawer deleted successfully" });
  } catch (error) {
    console.error("Error deleting cash drawer:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
