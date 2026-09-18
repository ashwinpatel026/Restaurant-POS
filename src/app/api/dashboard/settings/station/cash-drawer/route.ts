import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserAccessInfo,
  getSelectedStoreCode,
} from "@/lib/auth/accessControl";
import { prisma } from "@/lib/database";
import {
  createCashDrawer,
  findDuplicateCashDrawer,
  generateCashDrawerCode,
  listCashDrawers,
  listPrinterOptions,
  normalizeConnectionType,
  serializeCashDrawer,
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

    const [records, printers] = await Promise.all([
      listCashDrawers(selectedStoreCode, stationCode),
      listPrinterOptions(selectedStoreCode),
    ]);

    return NextResponse.json({
      drawers: records.map(serializeCashDrawer),
      printers,
    });
  } catch (error) {
    console.error("Error fetching cash drawers:", error);
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

    const station = await prisma.station.findFirst({
      where: { stationCode, storeCode: selectedStoreCode },
      select: { stationCode: true },
    });

    if (!station) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    const duplicate = await findDuplicateCashDrawer({
      storeCode: selectedStoreCode,
      stationCode,
      cashDrawerName: payload.cashDrawerName,
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "Cash drawer with this name already exists for this station" },
        { status: 400 },
      );
    }

    const userId = parseInt(session.user.id ?? "0", 10) || undefined;
    const created = await createCashDrawer({
      ...payload,
      cashDrawerCode: await generateCashDrawerCode(selectedStoreCode),
      stationCode,
      storeCode: selectedStoreCode,
      createdBy: userId,
    });

    return NextResponse.json(
      { drawer: serializeCashDrawer(created) },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating cash drawer:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
