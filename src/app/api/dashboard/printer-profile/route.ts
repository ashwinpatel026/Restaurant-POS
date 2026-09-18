import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserAccessInfo,
  getSelectedStoreCode,
  buildStoreFilter,
  checkLocationPermission,
} from "@/lib/auth/accessControl";
import { prisma } from "@/lib/database";

const PRINTER_TYPES = ["Receipt", "Prep-Zone", "Document"] as const;

function getDelegate(name: "printerProfile" | "stationProfileSetting") {
  const delegate = (prisma as any)[name];
  if (!delegate) {
    throw new Error(
      `Prisma ${name} model is unavailable. Restart the dev server after prisma generate.`,
    );
  }
  return delegate;
}

function serializeProfile(profile: any) {
  return {
    ...profile,
    profileId: profile.profileId?.toString?.() ?? String(profile.profileId),
    createdBy: profile.createdBy ?? null,
    updatedBy: profile.updatedBy ?? null,
  };
}

function nextSequence(codes: string[], prefix: string) {
  const numbers = codes
    .map((code) => {
      const match = code.match(new RegExp(`^${prefix}(\\d+)$`));
      return match ? Number.parseInt(match[1], 10) : 0;
    })
    .filter((value) => value > 0);

  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
}

async function generateProfileCode(storeCode: string) {
  const prefix = `WL${storeCode}PRF`;
  const profiles = await getDelegate("printerProfile").findMany({
    where: { profileCode: { startsWith: prefix } },
    select: { profileCode: true },
  });
  return `${prefix}${nextSequence(
    profiles.map((item: { profileCode: string }) => item.profileCode),
    prefix,
  )}`;
}

async function generateSettingCodes(storeCode: string, count: number) {
  const prefix = `WL${storeCode}SPS`;
  const settings = await getDelegate("stationProfileSetting").findMany({
    where: { profileSettingCode: { startsWith: prefix } },
    select: { profileSettingCode: true },
  });
  const start = nextSequence(
    settings.map((item: { profileSettingCode: string }) => item.profileSettingCode),
    prefix,
  );
  return Array.from({ length: count }, (_, index) => `${prefix}${start + index}`);
}

function serializeAssignment(assignment: any) {
  return {
    ...assignment,
    profileSettingId:
      assignment.profileSettingId?.toString?.() ??
      String(assignment.profileSettingId),
    createdBy: assignment.createdBy ?? null,
    updatedBy: assignment.updatedBy ?? null,
  };
}

async function loadAssignments(storeCode: string, profileCode?: string) {
  const where: Record<string, unknown> = {
    storeCode,
    isDelete: false,
  };
  if (profileCode) {
    where.profileCode = profileCode;
  }

  const [assignments, stations, printers, profiles] = await Promise.all([
    getDelegate("stationProfileSetting").findMany({
      where,
      orderBy: { profileSettingId: "asc" },
    }),
    prisma.station.findMany({
      where: { storeCode },
      select: { stationCode: true, stationname: true },
    }),
    prisma.printer.findMany({
      where: { storeCode, isDelete: false },
      select: { printerCode: true, printerName: true },
    }),
    getDelegate("printerProfile").findMany({
      where: { storeCode, isDelete: false },
      select: { profileCode: true, name: true },
    }),
  ]);

  const stationMap = new Map(
    stations.map((station) => [station.stationCode, station.stationname]),
  );
  const printerMap = new Map(
    printers.map((printer) => [printer.printerCode, printer.printerName]),
  );
  const profileMap = new Map(
    profiles.map((profile: { profileCode: string; name: string }) => [
      profile.profileCode,
      profile.name,
    ]),
  );

  return assignments.map((assignment: any) => ({
    ...serializeAssignment(assignment),
    profileName: profileMap.get(assignment.profileCode) || assignment.profileCode,
    stationName: stationMap.get(assignment.stationCode) || assignment.stationCode,
    localPrinterName: assignment.localPrinterCode
      ? printerMap.get(assignment.localPrinterCode) || assignment.localPrinterCode
      : "",
    backupPrinterName: assignment.backupPrinterCode
      ? printerMap.get(assignment.backupPrinterCode) ||
        assignment.backupPrinterCode
      : "",
  }));
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await checkLocationPermission(session.user.role, "printers.view"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    const storeFilter = buildStoreFilter(accessInfo, selectedStoreCode);
    const profiles = await getDelegate("printerProfile").findMany({
      where: {
        ...storeFilter,
        isDelete: false,
      },
      orderBy: { createdOn: "desc" },
    });

    const assignments = await loadAssignments(selectedStoreCode);

    return NextResponse.json({
      profiles: profiles.map(serializeProfile),
      assignments,
    });
  } catch (error) {
    console.error("Error fetching printer profiles:", error);
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await checkLocationPermission(session.user.role, "printers.create"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    const body = await request.json();
    const name = String(body.name || "").trim();
    const printerType = String(body.printerType || "").trim();
    const isActive = body.isActive !== false;

    if (!name) {
      return NextResponse.json(
        { error: "Profile name is required" },
        { status: 400 },
      );
    }

    if (!PRINTER_TYPES.includes(printerType as (typeof PRINTER_TYPES)[number])) {
      return NextResponse.json(
        { error: "Printer type is required" },
        { status: 400 },
      );
    }

    const duplicate = await getDelegate("printerProfile").findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        storeCode: selectedStoreCode,
        isDelete: false,
      },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "Printer profile with this name already exists" },
        { status: 400 },
      );
    }

    const userId = parseInt(session.user.id, 10) || undefined;
    const profileCode = await generateProfileCode(selectedStoreCode);
    const stations = await prisma.station.findMany({
      where: { storeCode: selectedStoreCode },
      select: { stationCode: true },
      orderBy: { stationname: "asc" },
    });
    const settingCodes = await generateSettingCodes(
      selectedStoreCode,
      stations.length,
    );

    const profile = await prisma.$transaction(async (tx) => {
      const created = await (tx as any).printerProfile.create({
        data: {
          profileCode,
          name,
          printerType,
          isActive,
          isDelete: false,
          createdBy: userId,
          storeCode: selectedStoreCode,
          isSyncToWeb: 0,
          isSyncToLocal: 0,
          syncSource: "location",
        },
      });

      if (stations.length > 0) {
        await (tx as any).stationProfileSetting.createMany({
          data: stations.map((station, index) => ({
            profileSettingCode: settingCodes[index],
            stationCode: station.stationCode,
            profileCode,
            storeCode: selectedStoreCode,
            isActive: true,
            isDelete: false,
            createdBy: userId,
            isSyncToWeb: 0,
            isSyncToLocal: 0,
            syncSource: "location",
          })),
        });
      }

      return created;
    });

    return NextResponse.json(
      {
        profile: serializeProfile(profile),
        stationAssignmentsCreated: stations.length,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating printer profile:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
