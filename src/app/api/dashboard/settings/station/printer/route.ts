import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserAccessInfo,
  getSelectedStoreCode,
} from "@/lib/auth/accessControl";
import { prisma } from "@/lib/database";

type StationAssignment = {
  profileSettingId: bigint;
  profileCode: string;
  localPrinterCode: string | null;
  backupPrinterCode: string | null;
};

function nextSequence(codes: string[], prefix: string) {
  const numbers = codes
    .map((code) => {
      const match = code.match(new RegExp(`^${prefix}(\\d+)$`));
      return match ? Number.parseInt(match[1], 10) : 0;
    })
    .filter((value) => value > 0);

  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
}

async function generateSettingCodes(storeCode: string, count: number) {
  const prefix = `WL${storeCode}SPS`;
  const settings = await prisma.stationProfileSetting.findMany({
    where: { profileSettingCode: { startsWith: prefix } },
    select: { profileSettingCode: true },
  });
  const start = nextSequence(
    settings.map(
      (item: { profileSettingCode: string }) => item.profileSettingCode,
    ),
    prefix,
  );
  return Array.from({ length: count }, (_, index) => `${prefix}${start + index}`);
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

    const station = await prisma.station.findFirst({
      where: { stationCode, storeCode: selectedStoreCode },
      select: { stationCode: true },
    });

    if (!station) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    const [profiles, printers, assignments] = await Promise.all([
      prisma.printerProfile.findMany({
        where: { storeCode: selectedStoreCode, isDelete: false },
        orderBy: { name: "asc" },
      }),
      prisma.printer.findMany({
        where: { storeCode: selectedStoreCode, isDelete: false },
        select: {
          printerCode: true,
          printerName: true,
          isreceipt: true,
          isKitchen: true,
          isdocument: true,
        },
        orderBy: { printerName: "asc" },
      }),
      prisma.stationProfileSetting.findMany({
        where: {
          storeCode: selectedStoreCode,
          stationCode,
          isDelete: false,
        },
      }),
    ]);

    const assignmentMap = new Map<string, StationAssignment>(
      assignments.map((assignment) => [assignment.profileCode, assignment]),
    );

    const rows = profiles.map((profile) => {
      const assignment = assignmentMap.get(profile.profileCode);
      return {
        profileId: profile.profileId?.toString?.() ?? String(profile.profileId),
        profileCode: profile.profileCode,
        profileName: profile.name,
        printerType: profile.printerType,
        profileSettingId: assignment?.profileSettingId
          ? assignment.profileSettingId.toString()
          : null,
        localPrinterCode: assignment?.localPrinterCode || "",
        backupPrinterCode: assignment?.backupPrinterCode || "",
      };
    });

    return NextResponse.json({
      printers: printers.map((printer) => ({
        printerCode: printer.printerCode,
        printerName: printer.printerName || printer.printerCode,
      })),
      rows,
    });
  } catch (error) {
    console.error("Error fetching station printer settings:", error);
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
    const assignments = Array.isArray(body.assignments) ? body.assignments : [];

    if (!stationCode) {
      return NextResponse.json(
        { error: "Station is required" },
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

    const userId = parseInt(session.user.id ?? "0", 10) || undefined;
    const printerCodes = new Set(
      (
        await prisma.printer.findMany({
          where: { storeCode: selectedStoreCode, isDelete: false },
          select: { printerCode: true },
        })
      ).map((printer) => printer.printerCode),
    );

    const profiles = await prisma.printerProfile.findMany({
      where: { storeCode: selectedStoreCode, isDelete: false },
      select: { profileCode: true },
    });
    const profileCodes = new Set(
      profiles.map((profile) => profile.profileCode),
    );

    const existing = await prisma.stationProfileSetting.findMany({
      where: {
        storeCode: selectedStoreCode,
        stationCode,
        isDelete: false,
      },
    });
    const existingByProfile = new Map<string, StationAssignment>(
      existing.map((item) => [item.profileCode, item]),
    );

    const toCreate = assignments.filter(
      (item: any) =>
        profileCodes.has(String(item.profileCode || "").trim()) &&
        !existingByProfile.has(String(item.profileCode || "").trim()),
    );
    const settingCodes = await generateSettingCodes(
      selectedStoreCode,
      toCreate.length,
    );

    const normalizePrinterCode = (value: unknown) => {
      const code = String(value || "").trim();
      if (!code) return null;
      return printerCodes.has(code) ? code : null;
    };

    await prisma.$transaction(async (tx) => {
      let createIndex = 0;

      for (const item of assignments) {
        const profileCode = String(item.profileCode || "").trim();
        if (!profileCodes.has(profileCode)) continue;

        const localPrinterCode = normalizePrinterCode(item.localPrinterCode);
        const backupPrinterCode = normalizePrinterCode(item.backupPrinterCode);
        const current = existingByProfile.get(profileCode);

        if (current) {
          await tx.stationProfileSetting.update({
            where: { profileSettingId: current.profileSettingId },
            data: {
              localPrinterCode,
              backupPrinterCode,
              updatedBy: userId,
              updatedOn: new Date(),
              isSyncToWeb: 0,
              isSyncToLocal: 0,
              syncSource: "location",
            },
          });
        } else {
          await tx.stationProfileSetting.create({
            data: {
              profileSettingCode: settingCodes[createIndex],
              stationCode,
              profileCode,
              localPrinterCode,
              backupPrinterCode,
              storeCode: selectedStoreCode,
              isActive: true,
              isDelete: false,
              createdBy: userId,
              isSyncToWeb: 0,
              isSyncToLocal: 0,
              syncSource: "location",
            },
          });
          createIndex += 1;
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating station printer settings:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
