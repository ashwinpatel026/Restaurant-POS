import { randomUUID } from "crypto";
import { prisma } from "@/lib/database";

function getDelegate() {
  return (prisma as any).tenderType ?? null;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

export function serializeTender(record: any) {
  return {
    ...record,
    tenderTypeId:
      record.tenderTypeId?.toString?.() ?? String(record.tenderTypeId),
    displayOrder: toNumber(record.displayOrder, 0),
    surchargePer: toNumber(record.surchargePer, 0),
    preAuthAmount: toNumber(record.preAuthAmount, 0),
    isActive: toBoolean(record.isActive, true),
    requiresDevice: toBoolean(record.requiresDevice, false),
    allowTip: toBoolean(record.allowTip, false),
    preAuthAllow: toBoolean(record.preAuthAllow, false),
    signatureAllow: toBoolean(record.signatureAllow, false),
    taxExempt: toBoolean(record.taxExempt, false),
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
  tender_type_id AS "tenderTypeId",
  tender_code AS "tenderCode",
  tender_name AS "tenderName",
  tender_type AS "tenderType",
  device_selection_code AS "deviceSelectionCode",
  cash_drawer_code AS "cashDrawerCode",
  is_active AS "isActive",
  display_order AS "displayOrder",
  store_code AS "storeCode",
  station_code AS "stationCode",
  is_delete AS "isDelete",
  createdby AS "createdBy",
  createdon AS "createdOn",
  updatedby AS "updatedBy",
  updatedon AS "updatedOn",
  external_pay_code AS "externalPayCode",
  requires_device AS "requiresDevice",
  allow_tip AS "allowTip",
  fee_code AS "feeCode",
  surcharge_per AS "surchargePer",
  pre_auth_amount AS "preAuthAmount",
  pre_auth_allow AS "preAuthAllow",
  signature_allow AS "signatureAllow",
  tax_exampt AS "taxExempt"
`;

export async function listTenders(storeCode: string, stationCode: string) {
  const delegate = getDelegate();
  if (delegate) {
    return delegate.findMany({
      where: { storeCode, stationCode, isDelete: false },
      orderBy: [{ displayOrder: "asc" }, { createdOn: "asc" }],
    });
  }

  return prisma.$queryRawUnsafe(
    `SELECT ${SELECT_COLUMNS}
     FROM tbl_tender_type
     WHERE store_code = $1
       AND station_code = $2
       AND COALESCE(is_delete, false) = false
     ORDER BY display_order ASC, createdon ASC`,
    storeCode,
    stationCode,
  );
}

export async function findTenderById(tenderTypeId: bigint) {
  const delegate = getDelegate();
  if (delegate) {
    return delegate.findFirst({
      where: { tenderTypeId, isDelete: false },
    });
  }

  const records = (await prisma.$queryRawUnsafe(
    `SELECT ${SELECT_COLUMNS}
     FROM tbl_tender_type
     WHERE tender_type_id = $1
       AND COALESCE(is_delete, false) = false
     LIMIT 1`,
    tenderTypeId,
  )) as any[];

  return records[0] ?? null;
}

export async function findDuplicateTender(options: {
  storeCode: string;
  stationCode: string | null;
  tenderName: string;
  excludeId?: bigint;
}) {
  const delegate = getDelegate();
  if (delegate) {
    return delegate.findFirst({
      where: {
        tenderName: { equals: options.tenderName, mode: "insensitive" },
        storeCode: options.storeCode,
        stationCode: options.stationCode,
        isDelete: false,
        ...(options.excludeId ? { NOT: { tenderTypeId: options.excludeId } } : {}),
      },
    });
  }

  const records = options.excludeId
    ? ((await prisma.$queryRawUnsafe(
        `SELECT ${SELECT_COLUMNS}
         FROM tbl_tender_type
         WHERE LOWER(tender_name) = LOWER($1)
           AND store_code = $2
           AND station_code = $3
           AND COALESCE(is_delete, false) = false
           AND tender_type_id <> $4
         LIMIT 1`,
        options.tenderName,
        options.storeCode,
        options.stationCode,
        options.excludeId,
      )) as any[])
    : ((await prisma.$queryRawUnsafe(
        `SELECT ${SELECT_COLUMNS}
         FROM tbl_tender_type
         WHERE LOWER(tender_name) = LOWER($1)
           AND store_code = $2
           AND station_code = $3
           AND COALESCE(is_delete, false) = false
         LIMIT 1`,
        options.tenderName,
        options.storeCode,
        options.stationCode,
      )) as any[]);

  return records[0] ?? null;
}

export async function generateTenderCode(storeCode: string) {
  const prefix = `WL${storeCode}TND`;
  const delegate = getDelegate();
  const records = delegate
    ? await delegate.findMany({
        where: { tenderCode: { startsWith: prefix } },
        select: { tenderCode: true },
      })
    : ((await prisma.$queryRawUnsafe(
        `SELECT tender_code AS "tenderCode"
         FROM tbl_tender_type
         WHERE tender_code LIKE $1`,
        `${prefix}%`,
      )) as { tenderCode: string }[]);

  return `${prefix}${nextSequence(
    records.map((item: { tenderCode: string }) => item.tenderCode),
    prefix,
  )}`;
}

export type TenderWriteData = {
  tenderName: string;
  tenderType: string;
  deviceSelectionCode?: string | null;
  cashDrawerCode?: string | null;
  isActive: boolean;
  displayOrder: number;
  externalPayCode?: string | null;
  requiresDevice?: boolean;
  allowTip: boolean;
  feeCode?: string | null;
  surchargePer?: number;
  preAuthAmount: number;
  preAuthAllow: boolean;
  signatureAllow: boolean;
  taxExempt: boolean;
};

export async function createTender(data: TenderWriteData & {
  tenderCode: string;
  stationCode: string;
  storeCode: string;
  createdBy?: number;
}) {
  const delegate = getDelegate();
  if (delegate) {
    return delegate.create({
      data: {
        tenderCode: data.tenderCode,
        tenderName: data.tenderName,
        tenderType: data.tenderType,
        deviceSelectionCode: data.deviceSelectionCode || null,
        cashDrawerCode: data.cashDrawerCode || null,
        isActive: data.isActive,
        displayOrder: data.displayOrder,
        storeCode: data.storeCode,
        stationCode: data.stationCode,
        isDelete: false,
        createdBy: data.createdBy,
        isSyncToWeb: 0,
        isSyncToLocal: 0,
        syncSource: "location",
        externalPayCode: data.externalPayCode || null,
        requiresDevice: data.requiresDevice === true,
        allowTip: data.allowTip,
        feeCode: data.feeCode || null,
        surchargePer: data.surchargePer ?? 0,
        preAuthAmount: data.preAuthAmount,
        preAuthAllow: data.preAuthAllow,
        signatureAllow: data.signatureAllow,
        taxExempt: data.taxExempt,
      },
    });
  }

  const records = (await prisma.$queryRawUnsafe(
    `INSERT INTO tbl_tender_type (
        tender_code,
        tender_name,
        tender_type,
        device_selection_code,
        cash_drawer_code,
        is_active,
        display_order,
        store_code,
        station_code,
        is_delete,
        createdby,
        createdon,
        is_sync_to_web,
        is_sync_to_local,
        sync_id,
        sync_source,
        external_pay_code,
        requires_device,
        allow_tip,
        fee_code,
        surcharge_per,
        pre_auth_amount,
        pre_auth_allow,
        signature_allow,
        tax_exampt
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, false, $10, CURRENT_TIMESTAMP,
        0, 0, $11::uuid, 'location', $12, $13, $14, $15, $16, $17, $18, $19, $20
      )
      RETURNING ${SELECT_COLUMNS}`,
    data.tenderCode,
    data.tenderName,
    data.tenderType,
    data.deviceSelectionCode || null,
    data.cashDrawerCode || null,
    data.isActive,
    data.displayOrder,
    data.storeCode,
    data.stationCode,
    data.createdBy ?? null,
    randomUUID(),
    data.externalPayCode || null,
    data.requiresDevice === true,
    data.allowTip,
    data.feeCode || null,
    data.surchargePer ?? 0,
    data.preAuthAmount,
    data.preAuthAllow,
    data.signatureAllow,
    data.taxExempt,
  )) as any[];

  return records[0];
}

export async function updateTender(
  tenderTypeId: bigint,
  data: TenderWriteData & { updatedBy?: number },
) {
  const delegate = getDelegate();
  if (delegate) {
    return delegate.update({
      where: { tenderTypeId },
      data: {
        tenderName: data.tenderName,
        tenderType: data.tenderType,
        deviceSelectionCode: data.deviceSelectionCode || null,
        cashDrawerCode: data.cashDrawerCode || null,
        isActive: data.isActive,
        displayOrder: data.displayOrder,
        updatedBy: data.updatedBy,
        updatedOn: new Date(),
        isSyncToWeb: 0,
        isSyncToLocal: 0,
        syncSource: "location",
        externalPayCode: data.externalPayCode || null,
        requiresDevice: data.requiresDevice === true,
        allowTip: data.allowTip,
        feeCode: data.feeCode || null,
        surchargePer: data.surchargePer ?? 0,
        preAuthAmount: data.preAuthAmount,
        preAuthAllow: data.preAuthAllow,
        signatureAllow: data.signatureAllow,
        taxExempt: data.taxExempt,
      },
    });
  }

  const records = (await prisma.$queryRawUnsafe(
    `UPDATE tbl_tender_type
     SET tender_name = $2,
         tender_type = $3,
         device_selection_code = $4,
         cash_drawer_code = $5,
         is_active = $6,
         display_order = $7,
         updatedby = $8,
         updatedon = CURRENT_TIMESTAMP,
         is_sync_to_web = 0,
         is_sync_to_local = 0,
         sync_source = 'location',
         external_pay_code = $9,
         requires_device = $10,
         allow_tip = $11,
         fee_code = $12,
         surcharge_per = $13,
         pre_auth_amount = $14,
         pre_auth_allow = $15,
         signature_allow = $16,
         tax_exampt = $17
     WHERE tender_type_id = $1
     RETURNING ${SELECT_COLUMNS}`,
    tenderTypeId,
    data.tenderName,
    data.tenderType,
    data.deviceSelectionCode || null,
    data.cashDrawerCode || null,
    data.isActive,
    data.displayOrder,
    data.updatedBy ?? null,
    data.externalPayCode || null,
    data.requiresDevice === true,
    data.allowTip,
    data.feeCode || null,
    data.surchargePer ?? 0,
    data.preAuthAmount,
    data.preAuthAllow,
    data.signatureAllow,
    data.taxExempt,
  )) as any[];

  return records[0];
}

export async function listFeeOptions(storeCode: string) {
  const delegate = (prisma as any).feeMaster;
  if (delegate) {
    return delegate.findMany({
      where: { storeCode, isDelete: false },
      select: { feeCode: true, feeName: true },
      orderBy: { feeName: "asc" },
    });
  }

  return prisma.$queryRawUnsafe(
    `SELECT fee_code AS "feeCode", fee_name AS "feeName"
     FROM tbl_fee_master
     WHERE store_code = $1
       AND COALESCE(is_delete, false) = false
     ORDER BY fee_name ASC`,
    storeCode,
  );
}

export async function listCashDrawerOptions(storeCode: string) {
  const delegate = (prisma as any).cashDrawerMaster;
  if (delegate) {
    return delegate.findMany({
      where: { storeCode, isDelete: false, isActive: true },
      select: {
        cashDrawerCode: true,
        cashDrawerName: true,
        stationCode: true,
        comPort: true,
      },
      orderBy: { cashDrawerName: "asc" },
    });
  }

  return prisma.$queryRawUnsafe(
    `SELECT cash_drawer_code AS "cashDrawerCode",
            cash_drawer_name AS "cashDrawerName",
            station_code AS "stationCode",
            com_port AS "comPort"
     FROM tbl_cash_drawer_master
     WHERE store_code = $1
       AND COALESCE(is_delete, false) = false
       AND COALESCE(is_active, true) = true
     ORDER BY cash_drawer_name ASC`,
    storeCode,
  );
}
