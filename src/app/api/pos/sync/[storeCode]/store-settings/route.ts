import { NextRequest, NextResponse } from "next/server";
import { authenticatePOSRequest } from "@/lib/posApiHelper";
import { locationPrisma } from "@/lib/databaseManager";

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

function formatSettingsResponse(
  setting: {
    theme?: string | null;
    allowedColors?: string | null;
    primaryColor?: string | null;
    storeCode?: string | null;
    updatedOn?: Date | null;
    createdOn?: Date;
    storeCurrency?: string | null;
    operationDefaultPrice?: string | null;
    allowMultipleDiscount?: boolean | null;
    isAlternate?: boolean | null;
    roundingOffCashAmtNearest?: unknown;
    tipPer1?: unknown;
    tipPer2?: unknown;
    tipPer3?: unknown;
    gratuityTipPer1?: unknown;
    gratuityTipPer2?: unknown;
    gratuityTipPer3?: unknown;
    showDualPriceOnReceipt?: boolean | null;
  } | null,
  storeCode: string,
) {
  if (!setting) {
    return {
      theme: "light",
      allowedColors: DEFAULT_ALLOWED_COLORS,
      primaryColor: DEFAULT_PRIMARY_COLOR,
      storeCode,
    };
  }

  let allowedColors = DEFAULT_ALLOWED_COLORS;
  if (setting.allowedColors) {
    try {
      const parsed = JSON.parse(setting.allowedColors);
      if (Array.isArray(parsed) && parsed.length > 0) {
        allowedColors = parsed;
      }
    } catch (error) {
      console.warn("Failed to parse allowedColors from system setting", error);
    }
  }

  const primaryColor =
    setting.primaryColor && setting.primaryColor.length > 0
      ? setting.primaryColor
      : allowedColors[0] || DEFAULT_PRIMARY_COLOR;

  return {
    theme: setting.theme ?? "light",
    allowedColors,
    primaryColor,
    storeCode: setting.storeCode ?? storeCode,
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
  };
}

/**
 * @api {get} /api/pos/sync/:storeCode/store-settings Get store settings
 * @apiName GetStoreSettings
 * @apiGroup StoreSettings
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  storeCode Store code used for the query
 * @apiSuccess {Object}  data Store system settings
 * @apiSuccess {String}  data.theme Theme ("light" | "dark")
 * @apiSuccess {String[]} data.allowedColors Allowed theme colors
 * @apiSuccess {String}  data.primaryColor Primary theme color
 * @apiSuccess {String}  [data.storeCurrency] Store currency symbol
 * @apiSuccess {String}  [data.operationDefaultPrice] Default price operation ("card" | "cash")
 * @apiSuccess {Boolean} [data.allowMultipleDiscount] Allow multiple discounts
 * @apiSuccess {Boolean} [data.isAlternate] Alternate mode flag
 * @apiSuccess {Number}  [data.roundingOffCashAmtNearest] Cash rounding amount
 * @apiSuccess {Number}  [data.tipPer1] Tip percent option 1
 * @apiSuccess {Number}  [data.tipPer2] Tip percent option 2
 * @apiSuccess {Number}  [data.tipPer3] Tip percent option 3
 * @apiSuccess {Number}  [data.gratuityTipPer1] Gratuity tip percent option 1
 * @apiSuccess {Number}  [data.gratuityTipPer2] Gratuity tip percent option 2
 * @apiSuccess {Number}  [data.gratuityTipPer3] Gratuity tip percent option 3
 * @apiSuccess {Boolean} [data.showDualPriceOnReceipt] Show dual price on receipt
 *
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Store not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string }> },
) {
  try {
    const { storeCode } = await params;

    const auth = await authenticatePOSRequest(request, storeCode);
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 },
      );
    }

    const setting = await locationPrisma.systemSetting.findFirst({
      where: { storeCode },
      orderBy: { updatedOn: "desc" },
    });

    return NextResponse.json({
      success: true,
      storeCode,
      data: formatSettingsResponse(setting, storeCode),
    });
  } catch (error: any) {
    console.error("Error fetching store settings:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 },
    );
  }
}

/**
 * @api {put} /api/pos/sync/:storeCode/store-settings Update store settings
 * @apiName UpdateStoreSettings
 * @apiGroup StoreSettings
 * @apiVersion 1.0.0
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiBody {String[]} allowedColors Array of exactly 9 color values
 * @apiBody {String}  [primaryColor] Primary theme color (must be in allowedColors)
 * @apiBody {String}  [theme=light] Theme ("light" | "dark")
 * @apiBody {String}  [storeCurrency] Store currency symbol
 * @apiBody {String}  [operationDefaultPrice] Default price operation
 * @apiBody {Boolean} [allowMultipleDiscount] Allow multiple discounts
 * @apiBody {Boolean} [isAlternate] Alternate mode flag
 * @apiBody {Number}  [roundingOffCashAmtNearest] Cash rounding amount
 * @apiBody {Number}  [tipPer1] Tip percent option 1
 * @apiBody {Number}  [tipPer2] Tip percent option 2
 * @apiBody {Number}  [tipPer3] Tip percent option 3
 * @apiBody {Number}  [gratuityTipPer1] Gratuity tip percent option 1
 * @apiBody {Number}  [gratuityTipPer2] Gratuity tip percent option 2
 * @apiBody {Number}  [gratuityTipPer3] Gratuity tip percent option 3
 * @apiBody {Boolean} [showDualPriceOnReceipt] Show dual price on receipt
 * @apiBody {Number}  [updatedBy] User ID who updated the settings
 *
 * @apiParamExample {json} Request Body
 * {
 *   "theme": "light",
 *   "allowedColors": ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#14B8A6","#EC4899","#06B6D4","#84CC16"],
 *   "primaryColor": "#3B82F6",
 *   "storeCurrency": "$",
 *   "operationDefaultPrice": "card",
 *   "allowMultipleDiscount": false,
 *   "tipPer1": 15,
 *   "tipPer2": 18,
 *   "tipPer3": 20
 * }
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  message Confirmation message
 * @apiSuccess {Object}  data Updated store settings
 *
 * @apiError (400) BadRequest Invalid request body
 * @apiError (401) Unauthorized Authentication failed
 * @apiError (404) NotFound Store not found
 * @apiError (500) InternalServerError Unexpected error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string }> },
) {
  try {
    const { storeCode } = await params;

    const auth = await authenticatePOSRequest(request, storeCode);
    if (!auth.success) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 },
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

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
      updatedBy,
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
      updatedBy?: number | string;
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

    const userId =
      updatedBy !== undefined && updatedBy !== null
        ? parseInt(String(updatedBy), 10) || undefined
        : undefined;

    const existing = await locationPrisma.systemSetting.findFirst({
      where: { storeCode },
    });

    const data = {
      storeCode,
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
        showDualPriceOnReceipt ?? existing?.showDualPriceOnReceipt ?? undefined,
      updatedBy: userId,
      updatedOn: new Date(),
      isSyncToWeb: 1,
      isSyncToLocal: 0,
    };

    const record = existing
      ? await locationPrisma.systemSetting.update({
          where: { id: existing.id },
          data,
        })
      : await locationPrisma.systemSetting.create({
          data: {
            ...data,
            createdBy: userId,
          },
        });

    return NextResponse.json({
      success: true,
      message: existing
        ? "Store settings updated successfully"
        : "Store settings created successfully",
      storeCode,
      data: {
        theme: record.theme ?? "light",
        allowedColors,
        primaryColor,
        storeCode: record.storeCode,
        storeCurrency: record.storeCurrency,
        operationDefaultPrice: record.operationDefaultPrice,
        allowMultipleDiscount: record.allowMultipleDiscount,
        isAlternate: record.isAlternate,
        roundingOffCashAmtNearest: record.roundingOffCashAmtNearest,
        tipPer1: record.tipPer1,
        tipPer2: record.tipPer2,
        tipPer3: record.tipPer3,
        gratuityTipPer1: record.gratuityTipPer1,
        gratuityTipPer2: record.gratuityTipPer2,
        gratuityTipPer3: record.gratuityTipPer3,
        showDualPriceOnReceipt: record.showDualPriceOnReceipt,
      },
    });
  } catch (error: any) {
    console.error("Error updating store settings:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 },
    );
  }
}
