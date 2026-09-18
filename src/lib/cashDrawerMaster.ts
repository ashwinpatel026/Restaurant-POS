import { randomUUID } from "crypto";
import { prisma } from "@/lib/database";

export const CASH_DRAWER_CONNECTION_TYPES = ["Printer", "Comport"] as const;
export type CashDrawerConnectionType =
  (typeof CASH_DRAWER_CONNECTION_TYPES)[number];

export function normalizeConnectionType(value: unknown): CashDrawerConnectionType {
  return value === "Printer" ? "Printer" : "Comport";
}

function getDelegate() {
  return (prisma as any).cashDrawerMaster ?? null;
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === true || value === "true" || value === 1 || value === "1") {
    return true;
  }
  if (value === false || value === "false" || value === 0 || value === "0") {
    return false;
  }
  return fallback;
}

export function serializeCashDrawer(record: any) {
  return {
    ...record,
    cashDrawerId:
      record.cashDrawerId?.toString?.() ?? String(record.cashDrawerId),
    isActive: toBoolean(record.isActive, true),
    createdBy: record.createdBy ?? null,
    updatedBy: record.updatedBy ?? null,
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

const SELECT_COLUMNS = `
  cash_drawer_id AS "cashDrawerId",
  cash_drawer_code AS "cashDrawerCode",
  cash_drawer_name AS "cashDrawerName",
  com_port AS "comPort",
  station_code AS "stationCode",
  store_code AS "storeCode",
  is_active AS "isActive",
  is_delete AS "isDelete",
  createdby AS "createdBy",
  createdon AS "createdOn",
  updatedby AS "updatedBy",
  updatedon AS "updatedOn",
  connection_type AS "connectionType",
  printer_code AS "printerCode"
`;

export async function listCashDrawers(storeCode: string, stationCode: string) {
  const delegate = getDelegate();
  if (delegate) {
    return delegate.findMany({
      where: { storeCode, stationCode, isDelete: false },
      orderBy: { createdOn: "asc" },
    });
  }

  return prisma.$queryRawUnsafe(
    `SELECT ${SELECT_COLUMNS}
     FROM tbl_cash_drawer_master
     WHERE store_code = $1
       AND station_code = $2
       AND COALESCE(is_delete, false) = false
     ORDER BY createdon ASC`,
    storeCode,
    stationCode,
  );
}

export async function findCashDrawerById(cashDrawerId: bigint) {
  const delegate = getDelegate();
  if (delegate) {
    return delegate.findFirst({
      where: { cashDrawerId, isDelete: false },
    });
  }

  const records = (await prisma.$queryRawUnsafe(
    `SELECT ${SELECT_COLUMNS}
     FROM tbl_cash_drawer_master
     WHERE cash_drawer_id = $1
       AND COALESCE(is_delete, false) = false
     LIMIT 1`,
    cashDrawerId,
  )) as any[];

  return records[0] ?? null;
}

export async function findDuplicateCashDrawer(options: {
  storeCode: string;
  stationCode: string | null;
  cashDrawerName: string;
  excludeId?: bigint;
}) {
  const delegate = getDelegate();
  if (delegate) {
    return delegate.findFirst({
      where: {
        cashDrawerName: { equals: options.cashDrawerName, mode: "insensitive" },
        storeCode: options.storeCode,
        stationCode: options.stationCode,
        isDelete: false,
        ...(options.excludeId ? { NOT: { cashDrawerId: options.excludeId } } : {}),
      },
    });
  }

  const records = options.excludeId
    ? ((await prisma.$queryRawUnsafe(
        `SELECT ${SELECT_COLUMNS}
         FROM tbl_cash_drawer_master
         WHERE LOWER(cash_drawer_name) = LOWER($1)
           AND store_code = $2
           AND station_code = $3
           AND COALESCE(is_delete, false) = false
           AND cash_drawer_id <> $4
         LIMIT 1`,
        options.cashDrawerName,
        options.storeCode,
        options.stationCode,
        options.excludeId,
      )) as any[])
    : ((await prisma.$queryRawUnsafe(
        `SELECT ${SELECT_COLUMNS}
         FROM tbl_cash_drawer_master
         WHERE LOWER(cash_drawer_name) = LOWER($1)
           AND store_code = $2
           AND station_code = $3
           AND COALESCE(is_delete, false) = false
         LIMIT 1`,
        options.cashDrawerName,
        options.storeCode,
        options.stationCode,
      )) as any[]);

  return records[0] ?? null;
}

export async function generateCashDrawerCode(storeCode: string) {
  const prefix = `WL${storeCode}CDW`;
  const delegate = getDelegate();
  const records = delegate
    ? await delegate.findMany({
        where: { cashDrawerCode: { startsWith: prefix } },
        select: { cashDrawerCode: true },
      })
    : ((await prisma.$queryRawUnsafe(
        `SELECT cash_drawer_code AS "cashDrawerCode"
         FROM tbl_cash_drawer_master
         WHERE cash_drawer_code LIKE $1`,
        `${prefix}%`,
      )) as { cashDrawerCode: string }[]);

  return `${prefix}${nextSequence(
    records.map((item: { cashDrawerCode: string }) => item.cashDrawerCode),
    prefix,
  )}`;
}

export type CashDrawerWriteData = {
  cashDrawerName: string;
  comPort?: string | null;
  connectionType: CashDrawerConnectionType;
  printerCode?: string | null;
  isActive: boolean;
};

export async function createCashDrawer(
  data: CashDrawerWriteData & {
    cashDrawerCode: string;
    stationCode: string;
    storeCode: string;
    createdBy?: number;
  },
) {
  const printerCode =
    data.connectionType === "Printer" ? data.printerCode || null : null;
  const delegate = getDelegate();
  if (delegate) {
    return delegate.create({
      data: {
        cashDrawerCode: data.cashDrawerCode,
        cashDrawerName: data.cashDrawerName,
        comPort: data.comPort || null,
        connectionType: data.connectionType,
        printerCode,
        isActive: data.isActive,
        stationCode: data.stationCode,
        storeCode: data.storeCode,
        isDelete: false,
        createdBy: data.createdBy,
        isSyncToWeb: 0,
        isSyncToLocal: 0,
        syncSource: "location",
      },
    });
  }

  const records = (await prisma.$queryRawUnsafe(
    `INSERT INTO tbl_cash_drawer_master (
        cash_drawer_code,
        cash_drawer_name,
        com_port,
        station_code,
        store_code,
        is_active,
        is_delete,
        createdby,
        createdon,
        is_sync_to_web,
        is_sync_to_local,
        sync_id,
        sync_source,
        connection_type,
        printer_code
      ) VALUES (
        $1, $2, $3, $4, $5, $6, false, $7, CURRENT_TIMESTAMP, 0, 0,
        $8::uuid, 'location', $9, $10
      )
      RETURNING ${SELECT_COLUMNS}`,
    data.cashDrawerCode,
    data.cashDrawerName,
    data.comPort || null,
    data.stationCode,
    data.storeCode,
    data.isActive,
    data.createdBy ?? null,
    randomUUID(),
    data.connectionType,
    printerCode,
  )) as any[];

  return records[0];
}

export async function updateCashDrawer(
  cashDrawerId: bigint,
  data: CashDrawerWriteData & { updatedBy?: number },
) {
  const printerCode =
    data.connectionType === "Printer" ? data.printerCode || null : null;
  const delegate = getDelegate();
  if (delegate) {
    return delegate.update({
      where: { cashDrawerId },
      data: {
        cashDrawerName: data.cashDrawerName,
        comPort: data.comPort || null,
        connectionType: data.connectionType,
        printerCode,
        isActive: data.isActive,
        updatedBy: data.updatedBy,
        updatedOn: new Date(),
        isSyncToWeb: 0,
        isSyncToLocal: 0,
        syncSource: "location",
      },
    });
  }

  const records = (await prisma.$queryRawUnsafe(
    `UPDATE tbl_cash_drawer_master
     SET cash_drawer_name = $2,
         com_port = $3,
         connection_type = $4,
         printer_code = $5,
         is_active = $6,
         updatedby = $7,
         updatedon = CURRENT_TIMESTAMP,
         is_sync_to_web = 0,
         is_sync_to_local = 0,
         sync_source = 'location'
     WHERE cash_drawer_id = $1
     RETURNING ${SELECT_COLUMNS}`,
    cashDrawerId,
    data.cashDrawerName,
    data.comPort || null,
    data.connectionType,
    printerCode,
    data.isActive,
    data.updatedBy ?? null,
  )) as any[];

  return records[0];
}

export async function softDeleteCashDrawer(
  cashDrawerId: bigint,
  updatedBy?: number,
) {
  const delegate = getDelegate();
  if (delegate) {
    return delegate.update({
      where: { cashDrawerId },
      data: {
        isDelete: true,
        isActive: false,
        updatedBy,
        updatedOn: new Date(),
        syncSource: "location",
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `UPDATE tbl_cash_drawer_master
     SET is_delete = true,
         is_active = false,
         updatedby = $2,
         updatedon = CURRENT_TIMESTAMP,
         sync_source = 'location'
     WHERE cash_drawer_id = $1`,
    cashDrawerId,
    updatedBy ?? null,
  );
}

export async function listPrinterOptions(storeCode: string) {
  return prisma.printer.findMany({
    where: { storeCode, isDelete: false },
    select: { printerCode: true, printerName: true },
    orderBy: { printerName: "asc" },
  });
}
