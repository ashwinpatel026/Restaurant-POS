import { randomUUID } from "crypto";
import { prisma } from "@/lib/database";

function getDelegate() {
  return (prisma as any).externalPayMaster ?? null;
}

export function serializeExternalPay(record: any) {
  return {
    ...record,
    externalPayId:
      record.externalPayId?.toString?.() ?? String(record.externalPayId),
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
  external_pay_id AS "externalPayId",
  external_pay_code AS "externalPayCode",
  external_pay_name AS "externalPayName",
  station_code AS "stationCode",
  store_code AS "storeCode",
  is_active AS "isActive",
  is_delete AS "isDelete",
  createdby AS "createdBy",
  createdon AS "createdOn",
  updatedby AS "updatedBy",
  updatedon AS "updatedOn"
`;

export async function listExternalPays(storeCode: string, stationCode: string) {
  const delegate = getDelegate();
  if (delegate) {
    return delegate.findMany({
      where: { storeCode, stationCode, isDelete: false },
      orderBy: { createdOn: "asc" },
    });
  }

  return prisma.$queryRawUnsafe(
    `SELECT ${SELECT_COLUMNS}
     FROM tbl_external_pay_master
     WHERE store_code = $1
       AND station_code = $2
       AND COALESCE(is_delete, false) = false
     ORDER BY createdon ASC`,
    storeCode,
    stationCode,
  );
}

export async function findExternalPayById(externalPayId: bigint) {
  const delegate = getDelegate();
  if (delegate) {
    return delegate.findFirst({
      where: { externalPayId, isDelete: false },
    });
  }

  const records = (await prisma.$queryRawUnsafe(
    `SELECT ${SELECT_COLUMNS}
     FROM tbl_external_pay_master
     WHERE external_pay_id = $1
       AND COALESCE(is_delete, false) = false
     LIMIT 1`,
    externalPayId,
  )) as any[];

  return records[0] ?? null;
}

export async function findDuplicateExternalPay(options: {
  storeCode: string;
  stationCode: string | null;
  externalPayName: string;
  excludeId?: bigint;
}) {
  const delegate = getDelegate();
  if (delegate) {
    return delegate.findFirst({
      where: {
        externalPayName: {
          equals: options.externalPayName,
          mode: "insensitive",
        },
        storeCode: options.storeCode,
        stationCode: options.stationCode,
        isDelete: false,
        ...(options.excludeId ? { NOT: { externalPayId: options.excludeId } } : {}),
      },
    });
  }

  const records = options.excludeId
    ? ((await prisma.$queryRawUnsafe(
        `SELECT ${SELECT_COLUMNS}
         FROM tbl_external_pay_master
         WHERE LOWER(external_pay_name) = LOWER($1)
           AND store_code = $2
           AND station_code = $3
           AND COALESCE(is_delete, false) = false
           AND external_pay_id <> $4
         LIMIT 1`,
        options.externalPayName,
        options.storeCode,
        options.stationCode,
        options.excludeId,
      )) as any[])
    : ((await prisma.$queryRawUnsafe(
        `SELECT ${SELECT_COLUMNS}
         FROM tbl_external_pay_master
         WHERE LOWER(external_pay_name) = LOWER($1)
           AND store_code = $2
           AND station_code = $3
           AND COALESCE(is_delete, false) = false
         LIMIT 1`,
        options.externalPayName,
        options.storeCode,
        options.stationCode,
      )) as any[]);

  return records[0] ?? null;
}

export async function generateExternalPayCode(storeCode: string) {
  const prefix = `WL${storeCode}EPM`;
  const delegate = getDelegate();
  const records = delegate
    ? await delegate.findMany({
        where: { externalPayCode: { startsWith: prefix } },
        select: { externalPayCode: true },
      })
    : ((await prisma.$queryRawUnsafe(
        `SELECT external_pay_code AS "externalPayCode"
         FROM tbl_external_pay_master
         WHERE external_pay_code LIKE $1`,
        `${prefix}%`,
      )) as { externalPayCode: string }[]);

  return `${prefix}${nextSequence(
    records.map((item: { externalPayCode: string }) => item.externalPayCode),
    prefix,
  )}`;
}

export async function createExternalPay(data: {
  externalPayCode: string;
  externalPayName: string;
  stationCode: string;
  storeCode: string;
  isActive: boolean;
  createdBy?: number;
}) {
  const delegate = getDelegate();
  if (delegate) {
    return delegate.create({
      data: {
        ...data,
        isDelete: false,
        isSyncToWeb: 0,
        isSyncToLocal: 0,
        syncSource: "location",
      },
    });
  }

  const records = (await prisma.$queryRawUnsafe(
    `INSERT INTO tbl_external_pay_master (
        external_pay_code,
        external_pay_name,
        station_code,
        store_code,
        is_active,
        is_delete,
        createdby,
        createdon,
        is_sync_to_web,
        is_sync_to_local,
        sync_id,
        sync_source
      ) VALUES (
        $1, $2, $3, $4, $5, false, $6, CURRENT_TIMESTAMP, 0, 0, $7::uuid, 'location'
      )
      RETURNING ${SELECT_COLUMNS}`,
    data.externalPayCode,
    data.externalPayName,
    data.stationCode,
    data.storeCode,
    data.isActive,
    data.createdBy ?? null,
    randomUUID(),
  )) as any[];

  return records[0];
}

export async function updateExternalPay(
  externalPayId: bigint,
  data: {
    externalPayName: string;
    isActive: boolean;
    updatedBy?: number;
  },
) {
  const delegate = getDelegate();
  if (delegate) {
    return delegate.update({
      where: { externalPayId },
      data: {
        ...data,
        updatedOn: new Date(),
        isSyncToWeb: 0,
        isSyncToLocal: 0,
        syncSource: "location",
      },
    });
  }

  const records = (await prisma.$queryRawUnsafe(
    `UPDATE tbl_external_pay_master
     SET external_pay_name = $2,
         is_active = $3,
         updatedby = $4,
         updatedon = CURRENT_TIMESTAMP,
         is_sync_to_web = 0,
         is_sync_to_local = 0,
         sync_source = 'location'
     WHERE external_pay_id = $1
     RETURNING ${SELECT_COLUMNS}`,
    externalPayId,
    data.externalPayName,
    data.isActive,
    data.updatedBy ?? null,
  )) as any[];

  return records[0];
}

export async function softDeleteExternalPay(
  externalPayId: bigint,
  updatedBy?: number,
) {
  const delegate = getDelegate();
  if (delegate) {
    return delegate.update({
      where: { externalPayId },
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
    `UPDATE tbl_external_pay_master
     SET is_delete = true,
         is_active = false,
         updatedby = $2,
         updatedon = CURRENT_TIMESTAMP,
         sync_source = 'location'
     WHERE external_pay_id = $1`,
    externalPayId,
    updatedBy ?? null,
  );
}
