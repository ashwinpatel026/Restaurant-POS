import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserAccessInfo,
  getSelectedStoreCode,
} from "@/lib/auth/accessControl";
import { prisma } from "@/lib/database";
import { normalizePayDeviceType } from "@/lib/paymentDeviceConstants";
import {
  createPaymentDevice,
  findDuplicatePaymentDevice,
  generatePayDeviceCode,
  listPaymentDevices,
  serializePaymentDevice,
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

async function resolveStoreAndSession(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const accessInfo = await getUserAccessInfo(parseInt(session.user.id, 10));
  const selectedStoreCode = getSelectedStoreCode(
    accessInfo,
    request.nextUrl.searchParams.get("storeCode"),
  );

  if (!selectedStoreCode) {
    return {
      error: NextResponse.json(
        { error: "No accessible store selected" },
        { status: 403 },
      ),
    };
  }

  return { session, selectedStoreCode };
}

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveStoreAndSession(request);
    if ("error" in resolved) {
      return resolved.error;
    }

    const { selectedStoreCode } = resolved;
    const stationCode = request.nextUrl.searchParams.get("stationCode")?.trim();

    if (!stationCode) {
      return NextResponse.json(
        { error: "Station is required" },
        { status: 400 },
      );
    }

    const records = await listPaymentDevices(selectedStoreCode, stationCode);
    return NextResponse.json({
      devices: records.map(serializePaymentDevice),
    });
  } catch (error) {
    console.error("Error fetching payment devices:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveStoreAndSession(request);
    if ("error" in resolved) {
      return resolved.error;
    }

    const { session, selectedStoreCode } = resolved;
    const body = await request.json();
    const stationCode = String(body.stationCode || "").trim();
    const payload = parsePayload(body);

    if (!stationCode) {
      return NextResponse.json(
        { error: "Station is required" },
        { status: 400 },
      );
    }

    if (!payload.payDeviceName) {
      return NextResponse.json(
        { error: "Device name is required" },
        { status: 400 },
      );
    }

    const station = await prisma.station.findFirst({
      where: { stationCode, storeCode: selectedStoreCode },
      select: { stationCode: true },
    });

    if (!station) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    const duplicate = await findDuplicatePaymentDevice({
      storeCode: selectedStoreCode,
      stationCode,
      payDeviceName: payload.payDeviceName,
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "Device with this name already exists for this station" },
        { status: 400 },
      );
    }

    const userId = parseInt(session.user.id ?? "0", 10) || undefined;
    const created = await createPaymentDevice({
      ...payload,
      payDeviceCode: await generatePayDeviceCode(selectedStoreCode),
      stationCode,
      storeCode: selectedStoreCode,
      createdBy: userId,
    });

    return NextResponse.json(
      { device: serializePaymentDevice(created) },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating payment device:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
