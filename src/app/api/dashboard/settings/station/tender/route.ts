import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserAccessInfo,
  getSelectedStoreCode,
} from "@/lib/auth/accessControl";
import { prisma } from "@/lib/database";
import { listExternalPays, serializeExternalPay } from "@/lib/externalPayMaster";
import {
  listPaymentDevices,
  serializePaymentDevice,
  validateCardPaymentDevice,
} from "@/lib/paymentDeviceConfig";
import {
  createTender,
  findDuplicateTender,
  generateTenderCode,
  listCashDrawerOptions,
  listFeeOptions,
  listTenders,
  serializeTender,
} from "@/lib/tenderType";

const TENDER_TYPES = ["Cash", "Card", "Gift Card", "External Pay"] as const;

function parseTenderPayload(body: Record<string, unknown>) {
  const tenderName = String(body.tenderName || "").trim();
  const rawTenderType = String(body.tenderType || "").trim() || "Cash";
  const tenderType = TENDER_TYPES.includes(
    rawTenderType as (typeof TENDER_TYPES)[number],
  )
    ? rawTenderType
    : "Cash";
  const displayOrder = Number.parseInt(String(body.displayOrder ?? "0"), 10);
  const preAuthAmount = Number(body.preAuthAmount ?? 0);
  const surchargePer = Number(body.surchargePer ?? 0);

  return {
    tenderName,
    tenderType,
    deviceSelectionCode:
      tenderType === "Card"
        ? String(body.deviceSelectionCode || "").trim() || null
        : null,
    cashDrawerCode: String(body.cashDrawerCode || "").trim() || null,
    isActive: body.isActive !== false,
    displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
    externalPayCode:
      tenderType === "External Pay"
        ? String(body.externalPayCode || "").trim() || null
        : null,
    requiresDevice: tenderType === "Card",
    allowTip: body.allowTip === true,
    feeCode: String(body.feeCode || "").trim() || null,
    surchargePer: Number.isFinite(surchargePer) ? surchargePer : 0,
    preAuthAmount: Number.isFinite(preAuthAmount) ? preAuthAmount : 0,
    preAuthAllow: body.preAuthAllow === true,
    signatureAllow: body.signatureAllow === true,
    taxExempt: body.taxExempt === true,
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

    const [records, fees, cashDrawers, externalPays, paymentDevices] =
      await Promise.all([
        listTenders(selectedStoreCode, stationCode),
        listFeeOptions(selectedStoreCode),
        listCashDrawerOptions(selectedStoreCode),
        listExternalPays(selectedStoreCode, stationCode),
        listPaymentDevices(selectedStoreCode, stationCode),
      ]);

    return NextResponse.json({
      tenders: records.map(serializeTender),
      fees,
      cashDrawers,
      externalPays: externalPays.map(serializeExternalPay),
      paymentDevices: paymentDevices.map(serializePaymentDevice),
    });
  } catch (error) {
    console.error("Error fetching tenders:", error);
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
    const payload = parseTenderPayload(body);

    if (!stationCode) {
      return NextResponse.json(
        { error: "Station is required" },
        { status: 400 },
      );
    }

    if (!payload.tenderName) {
      return NextResponse.json(
        { error: "Tender name is required" },
        { status: 400 },
      );
    }

    const deviceError = await validateCardPaymentDevice({
      tenderType: payload.tenderType,
      deviceSelectionCode: payload.deviceSelectionCode,
      storeCode: selectedStoreCode,
      stationCode,
    });
    if (deviceError) {
      return NextResponse.json({ error: deviceError }, { status: 400 });
    }

    const station = await prisma.station.findFirst({
      where: { stationCode, storeCode: selectedStoreCode },
      select: { stationCode: true },
    });

    if (!station) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    const duplicate = await findDuplicateTender({
      storeCode: selectedStoreCode,
      stationCode,
      tenderName: payload.tenderName,
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "Tender with this name already exists for this station" },
        { status: 400 },
      );
    }

    const userId = parseInt(session.user.id ?? "0", 10) || undefined;
    const created = await createTender({
      ...payload,
      tenderCode: await generateTenderCode(selectedStoreCode),
      stationCode,
      storeCode: selectedStoreCode,
      createdBy: userId,
    });

    return NextResponse.json(
      { tender: serializeTender(created) },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating tender:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
