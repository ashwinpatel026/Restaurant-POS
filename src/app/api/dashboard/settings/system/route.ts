import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
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

const STORE_CODE = process.env.STORE_CODE || null;

function normaliseColor(value: string) {
  if (!value) return value;
  return value.trim().startsWith("#")
    ? value.trim().toUpperCase()
    : `#${value.trim().toUpperCase()}`;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const setting = await prisma.systemSetting.findFirst({
      where: {
        storeCode: STORE_CODE,
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
        storeCode: STORE_CODE,
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
        console.warn("Failed to parse allowedColors from system setting", error);
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
      storeCode: setting.storeCode ?? STORE_CODE,
      updatedOn: setting.updatedOn ?? setting.createdOn,
    });
  } catch (error) {
    console.error("Error fetching system settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    let { allowedColors, primaryColor, theme } = body as {
      allowedColors?: string[];
      primaryColor?: string;
      theme?: string;
    };

    if (!Array.isArray(allowedColors) || allowedColors.length !== 9) {
      return NextResponse.json(
        { error: "allowedColors must be an array of 9 values" },
        { status: 400 }
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
        storeCode: STORE_CODE,
      },
    });

    const data = {
      storeCode: STORE_CODE,
      theme: theme ?? "light",
      allowedColors: JSON.stringify(allowedColors),
      primaryColor,
      updatedBy: userId,
      updatedOn: new Date(),
    } as const;

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
      storeCode: record.storeCode ?? STORE_CODE,
    });
  } catch (error) {
    console.error("Error updating system settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

