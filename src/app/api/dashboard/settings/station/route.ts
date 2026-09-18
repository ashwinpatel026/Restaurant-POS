import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  getUserAccessInfo,
  getSelectedStoreCode,
} from "@/lib/auth/accessControl";
import { prisma } from "@/lib/database";

const DEFAULT_STATION_SETTINGS = {
  theme: "Dark",
  isBurg: false,
  burgComPort: null as string | null,
  localPrinterCode: null as string | null,
  backupPrinterCode: null as string | null,
  isCashDrawer: false,
  cashDrawerCode: null as string | null,
  cashDrawerComport: null as string | null,
  isBarcodeScanner: false,
  liquorDispenserCode: null as string | null,
  tabSelectionReqDin: false,
  enableMobileKeyboard: false,
  isAutoPicked: false,
  isAutoDelivered: false,
  openCheckSelection: "Dine-In",
  idealTimeLogout: "0",
  isTipAdjustmentReceipt: true,
  fontSize: 13,
};

const ORDER_TYPES = ["Dine-In", "To Go", "Delivery"] as const;

function normalizeTheme(value: unknown) {
  const theme = String(value ?? "").trim().toLowerCase();
  return theme === "light" ? "Light" : "Dark";
}

function normalizeOrderType(value: unknown) {
  const orderType = String(value ?? "").trim();
  return ORDER_TYPES.includes(orderType as (typeof ORDER_TYPES)[number])
    ? orderType
    : DEFAULT_STATION_SETTINGS.openCheckSelection;
}

function normalizeTimeout(value: unknown) {
  const timeout = Number.parseInt(String(value ?? "0"), 10);
  if (Number.isNaN(timeout)) return DEFAULT_STATION_SETTINGS.idealTimeLogout;
  return String(Math.min(400, Math.max(0, timeout)));
}

function normalizeFontSize(value: unknown) {
  const fontSize = Number.parseInt(String(value ?? "13"), 10);
  if (Number.isNaN(fontSize)) return DEFAULT_STATION_SETTINGS.fontSize;
  return Math.min(24, Math.max(8, fontSize));
}

function toBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1 || value === "1") return true;
  if (value === "false" || value === 0 || value === "0") return false;
  return fallback;
}

function mapStationSetting(setting: Record<string, any>) {
  return {
    theme: normalizeTheme(setting.theme ?? DEFAULT_STATION_SETTINGS.theme),
    isBurg: toBoolean(setting.isBurg, DEFAULT_STATION_SETTINGS.isBurg),
    burgComPort: setting.burgComPort ?? "",
    localPrinterCode: setting.localPrinterCode ?? "",
    backupPrinterCode: setting.backupPrinterCode ?? "",
    isCashDrawer: toBoolean(
      setting.isCashDrawer,
      DEFAULT_STATION_SETTINGS.isCashDrawer,
    ),
    cashDrawerCode: setting.cashDrawerCode ?? "",
    cashDrawerComport: setting.cashDrawerComport ?? "",
    isBarcodeScanner: toBoolean(
      setting.isBarcodeScanner,
      DEFAULT_STATION_SETTINGS.isBarcodeScanner,
    ),
    liquorDispenserCode: setting.liquorDispenserCode ?? "",
    tabSelectionReqDin: toBoolean(
      setting.tabSelectionReqDin,
      DEFAULT_STATION_SETTINGS.tabSelectionReqDin,
    ),
    enableMobileKeyboard: toBoolean(
      setting.enableMobileKeyboard,
      DEFAULT_STATION_SETTINGS.enableMobileKeyboard,
    ),
    isAutoPicked: toBoolean(
      setting.isAutoPicked,
      DEFAULT_STATION_SETTINGS.isAutoPicked,
    ),
    isAutoDelivered: toBoolean(
      setting.isAutoDelivered,
      DEFAULT_STATION_SETTINGS.isAutoDelivered,
    ),
    openCheckSelection: normalizeOrderType(
      setting.openCheckSelection ?? DEFAULT_STATION_SETTINGS.openCheckSelection,
    ),
    idealTimeLogout: normalizeTimeout(
      setting.idealTimeLogout ?? DEFAULT_STATION_SETTINGS.idealTimeLogout,
    ),
    isTipAdjustmentReceipt: toBoolean(
      setting.isTipAdjustmentReceipt,
      DEFAULT_STATION_SETTINGS.isTipAdjustmentReceipt,
    ),
    fontSize: normalizeFontSize(
      setting.fontSize ?? DEFAULT_STATION_SETTINGS.fontSize,
    ),
    stationCode: setting.stationCode,
    storeCode: setting.storeCode,
  };
}

function getStationSettingClient() {
  const stationSetting = (prisma as any).stationSetting;
  if (!stationSetting) {
    throw new Error(
      "Prisma StationSetting model is unavailable. Restart the dev server after prisma generate.",
    );
  }
  return stationSetting;
}

async function resolveStoreAndSession(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const accessInfo = await getUserAccessInfo(parseInt(session.user.id, 10));
  const queryStoreCode = request.nextUrl.searchParams.get("storeCode");
  const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode);

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
    const stationCode = request.nextUrl.searchParams.get("stationCode");

    if (!stationCode) {
      const stations = await prisma.station.findMany({
        where: { storeCode: selectedStoreCode },
        orderBy: { stationname: "asc" },
        select: {
          stationCode: true,
          stationname: true,
          isActive: true,
        },
      });

      return NextResponse.json({ stations });
    }

    const station = await prisma.station.findFirst({
      where: {
        stationCode,
        storeCode: selectedStoreCode,
      },
      select: {
        stationCode: true,
        stationname: true,
        isActive: true,
      },
    });

    if (!station) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    const stationSetting = getStationSettingClient();
    const setting = await stationSetting.findFirst({
      where: {
        stationCode,
        isDelete: { not: true },
      },
    });

    return NextResponse.json({
      station,
      setting: mapStationSetting(
        setting ?? {
          ...DEFAULT_STATION_SETTINGS,
          stationCode,
          storeCode: selectedStoreCode,
        },
      ),
    });
  } catch (error) {
    console.error("Error fetching station settings:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const resolved = await resolveStoreAndSession(request);
    if ("error" in resolved) {
      return resolved.error;
    }

    const { session, selectedStoreCode } = resolved;
    const body = await request.json();
    const stationCode = String(body.stationCode || "").trim();

    if (!stationCode) {
      return NextResponse.json(
        { error: "Station is required" },
        { status: 400 },
      );
    }

    const station = await prisma.station.findFirst({
      where: {
        stationCode,
        storeCode: selectedStoreCode,
      },
      select: { stationCode: true },
    });

    if (!station) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    const stationSetting = getStationSettingClient();
    const existing = await stationSetting.findFirst({
      where: {
        stationCode,
        isDelete: { not: true },
      },
    });

    const userId = parseInt(session.user.id ?? "0", 10) || undefined;
    const mapped = mapStationSetting({
      ...(existing ?? {}),
      ...body,
      stationCode,
      storeCode: selectedStoreCode,
    });

    const data = {
      theme: mapped.theme,
      isBurg: mapped.isBurg,
      burgComPort: mapped.burgComPort || null,
      localPrinterCode: mapped.localPrinterCode || null,
      backupPrinterCode: mapped.backupPrinterCode || null,
      isCashDrawer: mapped.isCashDrawer,
      cashDrawerCode: mapped.cashDrawerCode || null,
      cashDrawerComport: mapped.cashDrawerComport || null,
      isBarcodeScanner: mapped.isBarcodeScanner,
      liquorDispenserCode: mapped.liquorDispenserCode || null,
      tabSelectionReqDin: mapped.tabSelectionReqDin,
      enableMobileKeyboard: mapped.enableMobileKeyboard,
      isAutoPicked: mapped.isAutoPicked,
      isAutoDelivered: mapped.isAutoDelivered,
      openCheckSelection: mapped.openCheckSelection,
      idealTimeLogout: mapped.idealTimeLogout,
      isTipAdjustmentReceipt: mapped.isTipAdjustmentReceipt,
      fontSize: mapped.fontSize,
      isDelete: false,
      isActive: true,
      stationCode,
      storeCode: selectedStoreCode,
      updatedBy: userId,
      updatedOn: new Date(),
      isSyncToWeb: 0,
      isSyncToLocal: 0,
      syncSource: "location",
    };

    const record = existing
      ? await stationSetting.update({
          where: { stationSettingId: existing.stationSettingId },
          data,
        })
      : await stationSetting.create({
          data: {
            ...data,
            createdBy: userId,
          },
        });

    return NextResponse.json({
      station: { stationCode: station.stationCode },
      setting: mapStationSetting(record),
    });
  } catch (error) {
    console.error("Error updating station settings:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
