import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserAccessInfo,
  getSelectedStoreCode,
} from "@/lib/auth/accessControl";
import { prisma } from "@/lib/database";
import {
  createExternalPay,
  findDuplicateExternalPay,
  generateExternalPayCode,
  listExternalPays,
  serializeExternalPay,
} from "@/lib/externalPayMaster";

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

    const records = await listExternalPays(selectedStoreCode, stationCode);

    return NextResponse.json({
      tenders: records.map(serializeExternalPay),
    });
  } catch (error) {
    console.error("Error fetching external pay masters:", error);
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
    const externalPayName = String(body.externalPayName || "").trim();
    const isActive = body.isActive !== false;

    if (!stationCode) {
      return NextResponse.json(
        { error: "Station is required" },
        { status: 400 },
      );
    }

    if (!externalPayName) {
      return NextResponse.json(
        { error: "Tender name is required" },
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

    const duplicate = await findDuplicateExternalPay({
      storeCode: selectedStoreCode,
      stationCode,
      externalPayName,
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "Tender with this name already exists for this station" },
        { status: 400 },
      );
    }

    const userId = parseInt(session.user.id ?? "0", 10) || undefined;
    const created = await createExternalPay({
      externalPayCode: await generateExternalPayCode(selectedStoreCode),
      externalPayName,
      stationCode,
      storeCode: selectedStoreCode,
      isActive,
      createdBy: userId,
    });

    return NextResponse.json(
      { tender: serializeExternalPay(created) },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating external pay master:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
