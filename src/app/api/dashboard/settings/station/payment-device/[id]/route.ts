import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserAccessInfo,
  getSelectedStoreCode,
  canAccessStore,
} from "@/lib/auth/accessControl";
import { normalizePayDeviceType } from "@/lib/paymentDeviceConstants";
import {
  findDuplicatePaymentDevice,
  findPaymentDeviceById,
  serializePaymentDevice,
  softDeletePaymentDevice,
  updatePaymentDevice,
} from "@/lib/paymentDeviceConfig";

function parsePayload(body: Record<string, unknown>) {
  const portValue = String(body.portNo ?? "").trim();
  const parsedPort = Number.parseInt(portValue, 10);

  return {
    payDeviceName: String(body.payDeviceName || "").trim(),
    payDeviceType: normalizePayDeviceType(body.payDeviceType),
    appId: String(body.appId || "").trim() || null,
    appKey: String(body.appKey || "").trim() || null,
    epi: String(body.epi || "").trim() || null,
    ipAddress: String(body.ipAddress || "").trim() || null,
    portNo: portValue === "" || Number.isNaN(parsedPort) ? null : parsedPort,
    isActive: body.isActive !== false,
    isDeviceLive: body.isDeviceLive === true,
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
    const configId = BigInt(resolvedParams.id);
    const existing = await findPaymentDeviceById(configId);

    if (!existing || existing.storeCode !== selectedStoreCode) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    const body = await request.json();
    const payload = parsePayload({ ...existing, ...body });

    if (!payload.payDeviceName) {
      return NextResponse.json(
        { error: "Device name is required" },
        { status: 400 },
      );
    }

    const duplicate = await findDuplicatePaymentDevice({
      storeCode: selectedStoreCode,
      stationCode: existing.stationCode,
      payDeviceName: payload.payDeviceName,
      excludeId: configId,
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "Device with this name already exists for this station" },
        { status: 400 },
      );
    }

    const userId = parseInt(session.user.id, 10) || undefined;
    const updated = await updatePaymentDevice(configId, {
      ...payload,
      updatedBy: userId,
    });

    return NextResponse.json({ device: serializePaymentDevice(updated) });
  } catch (error) {
    console.error("Error updating payment device:", error);
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
    const configId = BigInt(resolvedParams.id);
    const existing = await findPaymentDeviceById(configId);

    if (!existing) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    if (existing.storeCode && !canAccessStore(accessInfo, existing.storeCode)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const userId = parseInt(session.user.id, 10) || undefined;
    await softDeletePaymentDevice(configId, userId);

    return NextResponse.json({ message: "Payment device deleted successfully" });
  } catch (error) {
    console.error("Error deleting payment device:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
