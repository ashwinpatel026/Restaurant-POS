import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  getUserAccessInfo,
  getSelectedStoreCode,
} from "@/lib/auth/accessControl";
import { prisma } from "@/lib/database";

const DEFAULT_ALLOWED_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#14B8A6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
];

const DEFAULT_PRIMARY_COLOR = DEFAULT_ALLOWED_COLORS[0];

function normaliseColor(value: string) {
  if (!value) return value;
  return value.trim().startsWith("#")
    ? value.trim().toUpperCase()
    : `#${value.trim().toUpperCase()}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id, 10));

    const searchParams = request.nextUrl.searchParams;
    const queryStoreCode = searchParams.get("storeCode");
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode);

    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: "No accessible store selected" },
        { status: 403 },
      );
    }

    const setting = await prisma.systemSetting.findFirst({
      where: {
        storeCode: selectedStoreCode,
      },
      orderBy: {
        updatedOn: "desc",
      },
    });

    if (!setting) {
      return NextResponse.json({
        theme: "light",
        allowedColors: DEFAULT_ALLOWED_COLORS,
        primaryColor: DEFAULT_PRIMARY_COLOR,
        storeCode: selectedStoreCode,
      });
    }

    let allowedColors = DEFAULT_ALLOWED_COLORS;
    if (setting.allowedColors) {
      try {
        const parsed = JSON.parse(setting.allowedColors);
        if (Array.isArray(parsed) && parsed.length > 0) {
          allowedColors = parsed;
        }
      } catch (error) {
        console.warn(
          "Failed to parse allowedColors from system setting",
          error,
        );
      }
    }

    const primaryColor =
      setting.primaryColor && setting.primaryColor.length > 0
        ? setting.primaryColor
        : allowedColors[0] || DEFAULT_PRIMARY_COLOR;

    return NextResponse.json({
      theme: setting.theme ?? "light",
      allowedColors,
      primaryColor,
      storeCode: setting.storeCode ?? selectedStoreCode,
      updatedOn: setting.updatedOn ?? setting.createdOn,
      storeCurrency: setting.storeCurrency,
      operationDefaultPrice: setting.operationDefaultPrice,
      allowMultipleDiscount: setting.allowMultipleDiscount,
      isAlternate: setting.isAlternate,
      roundingOffCashAmtNearest: setting.roundingOffCashAmtNearest,
      tipPer1: setting.tipPer1,
      tipPer2: setting.tipPer2,
      tipPer3: setting.tipPer3,
      gratuityTipPer1: setting.gratuityTipPer1,
      gratuityTipPer2: setting.gratuityTipPer2,
      gratuityTipPer3: setting.gratuityTipPer3,
      showDualPriceOnReceipt: setting.showDualPriceOnReceipt,
    });
  } catch (error) {
    console.error("Error fetching system settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessInfo = await getUserAccessInfo(parseInt(session.user.id, 10));

    const searchParams = request.nextUrl.searchParams;
    const queryStoreCode = searchParams.get("storeCode");
    const selectedStoreCode = getSelectedStoreCode(accessInfo, queryStoreCode);

    if (!selectedStoreCode) {
      return NextResponse.json(
        { error: "No accessible store selected" },
        { status: 403 },
      );
    }

    const body = await request.json();
    let {
      allowedColors,
      primaryColor,
      theme,
      storeCurrency,
      operationDefaultPrice,
      allowMultipleDiscount,
      isAlternate,
      roundingOffCashAmtNearest,
      tipPer1,
      tipPer2,
      tipPer3,
      gratuityTipPer1,
      gratuityTipPer2,
      gratuityTipPer3,
      showDualPriceOnReceipt,
    } = body as {
      allowedColors?: string[];
      primaryColor?: string;
      theme?: string;
      storeCurrency?: string;
      operationDefaultPrice?: string;
      allowMultipleDiscount?: boolean;
      isAlternate?: boolean;
      roundingOffCashAmtNearest?: string | number;
      tipPer1?: string | number;
      tipPer2?: string | number;
      tipPer3?: string | number;
      gratuityTipPer1?: string | number;
      gratuityTipPer2?: string | number;
      gratuityTipPer3?: string | number;
      showDualPriceOnReceipt?: boolean;
    };

    if (!Array.isArray(allowedColors) || allowedColors.length !== 9) {
      return NextResponse.json(
        { error: "allowedColors must be an array of 9 values" },
        { status: 400 },
      );
    }

    allowedColors = allowedColors.map((color) => normaliseColor(color));
    primaryColor = normaliseColor(primaryColor || allowedColors[0]);

    if (!allowedColors.includes(primaryColor)) {
      primaryColor = allowedColors[0];
    }

    const userId = parseInt(session.user.id ?? "0", 10) || undefined;

    const existing = await prisma.systemSetting.findFirst({
      where: {
        storeCode: selectedStoreCode,
      },
    });

    const data = {
      storeCode: selectedStoreCode,
      theme: theme ?? "light",
      allowedColors: JSON.stringify(allowedColors),
      primaryColor,
      storeCurrency: storeCurrency ?? existing?.storeCurrency ?? undefined,
      operationDefaultPrice:
        operationDefaultPrice ?? existing?.operationDefaultPrice ?? undefined,
      allowMultipleDiscount:
        allowMultipleDiscount ?? existing?.allowMultipleDiscount ?? undefined,
      isAlternate: isAlternate ?? existing?.isAlternate ?? undefined,
      roundingOffCashAmtNearest:
        roundingOffCashAmtNearest ??
        existing?.roundingOffCashAmtNearest ??
        undefined,
      tipPer1: tipPer1 ?? existing?.tipPer1 ?? undefined,
      tipPer2: tipPer2 ?? existing?.tipPer2 ?? undefined,
      tipPer3: tipPer3 ?? existing?.tipPer3 ?? undefined,
      gratuityTipPer1:
        gratuityTipPer1 ?? existing?.gratuityTipPer1 ?? undefined,
      gratuityTipPer2:
        gratuityTipPer2 ?? existing?.gratuityTipPer2 ?? undefined,
      gratuityTipPer3:
        gratuityTipPer3 ?? existing?.gratuityTipPer3 ?? undefined,
      showDualPriceOnReceipt:
        showDualPriceOnReceipt ??
        existing?.showDualPriceOnReceipt ??
        undefined,
      updatedBy: userId,
      updatedOn: new Date(),
    } as const;
    console.log("data", data);
    const record = existing
      ? await prisma.systemSetting.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.systemSetting.create({
          data: {
            ...data,
            createdBy: userId,
          },
        });

    return NextResponse.json({
      theme: record.theme ?? "light",
      allowedColors,
      primaryColor,
      storeCode: record.storeCode,
    });
  } catch (error) {
    console.error("Error updating system settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
