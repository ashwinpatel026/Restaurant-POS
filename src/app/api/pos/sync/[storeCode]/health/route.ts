import { NextRequest, NextResponse } from "next/server";
import { authenticatePOSRequest } from "@/lib/posApiHelper";
import { checkDatabases, masterPrisma } from "@/lib/databaseManager";

/**
 * @api {get} /api/pos/sync/:storeCode/health Health check
 * @apiName POSHealthCheck
 * @apiGroup Health
 * @apiVersion 1.0.0
 *
 * @apiDescription
 * Validates that the store code and POS API key (or JWT) match, the location is
 * active with sync enabled, and both databases are reachable.
 * Call this before other sync APIs to confirm the connection is OK.
 *
 * @apiHeader {String} x-api-key API key for POS authentication
 * @apiHeader {String} [Authorization] Bearer POS JWT token (alternative to API key)
 *
 * @apiParam {String} storeCode Store code (e.g., "LOC001")
 *
 * @apiSuccess {Boolean} success Request success flag
 * @apiSuccess {String}  status Health status ("ok")
 * @apiSuccess {String}  storeCode Authenticated store code
 * @apiSuccess {String}  locationId Location ID
 * @apiSuccess {String}  locationName Location name
 * @apiSuccess {Boolean} syncEnabled Whether sync is enabled
 * @apiSuccess {Object}  databases Database connectivity
 * @apiSuccess {Boolean} databases.master Master DB reachable
 * @apiSuccess {Boolean} databases.location Location DB reachable
 * @apiSuccess {String}  checkedAt ISO timestamp of the check
 *
 * @apiError (401) Unauthorized Authentication failed or API key does not match store code
 * @apiError (404) NotFound Store not found
 * @apiError (503) ServiceUnavailable Database connection failed
 * @apiError (500) InternalServerError Unexpected error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeCode: string }> },
) {
  try {
    const { storeCode } = await params;

    // Verify store code + API key / JWT match and location is valid
    const auth = await authenticatePOSRequest(request, storeCode);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    // Test database connectivity
    const databases = await checkDatabases();
    if (!databases.master || !databases.location) {
      return NextResponse.json(
        {
          success: false,
          status: "degraded",
          storeCode,
          error: "Database connection failed",
          databases,
          checkedAt: new Date().toISOString(),
        },
        { status: 503 },
      );
    }

    // Load location details for confirmation response
    const location = await masterPrisma.location.findUnique({
      where: { storeCode },
      select: {
        locationId: true,
        locationName: true,
        storeCode: true,
        isActive: true,
        syncEnabled: true,
        lastSyncAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      status: "ok",
      message: "Store code and API key verified. Connection OK.",
      storeCode,
      locationId: location?.locationId?.toString(),
      locationName: location?.locationName,
      syncEnabled: location?.syncEnabled === 1,
      lastSyncAt: location?.lastSyncAt?.toISOString() ?? null,
      databases,
      checkedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("POS health check error:", error);
    return NextResponse.json(
      {
        success: false,
        status: "error",
        error: "Internal server error",
        message: error.message,
      },
      { status: 500 },
    );
  }
}
