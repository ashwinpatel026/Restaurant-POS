import { randomUUID } from "crypto";
import { prisma } from "@/lib/database";
import { getPaymentDeviceConstants } from "@/lib/paymentDeviceConstants";

function getDelegate() {
  return (prisma as any).paymentDeviceConfig ?? null;
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

function toPort(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function serializePaymentDevice(record: any) {
  return {
    ...record,
    configId: record.configId?.toString?.() ?? String(record.configId),
    portNo: toPort(record.portNo),
    isActive: toBoolean(record.isActive, true),
    isDeviceLive: toBoolean(record.isDeviceLive, false),
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
  config_id AS "configId",
  pay_device_code AS "payDeviceCode",
  pay_device_name AS "payDeviceName",
  api_url AS "apiUrl",
  api_key AS "apiKey",
  app_id AS "appId",
  app_key AS "appKey",
  epi,
  chennelid AS "chennelId",
  ip_address AS "ipAddress",
  port_no AS "portNo",
  is_active AS "isActive",
  station_code AS "stationCode",
  store_code AS "storeCode",
  is_delete AS "isDelete",
  createdby AS "createdBy",
  createdon AS "createdOn",
  updatedby AS "updatedBy",
  updatedon AS "updatedOn",
  pay_device_type AS "payDeviceType",
  isv_key AS "isvKey",
  is_device_live AS "isDeviceLive"
`;

export async function listPaymentDevices(storeCode: string, stationCode: string) {
  const delegate = getDelegate();
  if (delegate) {
    return delegate.findMany({
      where: { storeCode, stationCode, isDelete: false },
      orderBy: { createdOn: "asc" },
    });
  }

  return prisma.$queryRawUnsafe(
    `SELECT ${SELECT_COLUMNS}
     FROM tbl_payment_device_config
     WHERE store_code = $1
       AND station_code = $2
       AND COALESCE(is_delete, false) = false
     ORDER BY createdon ASC`,
    storeCode,
    stationCode,
  );
}

export async function findPaymentDeviceById(configId: bigint) {
  const delegate = getDelegate();
  if (delegate) {
    return delegate.findFirst({
      where: { configId, isDelete: false },
    });
  }

  const records = (await prisma.$queryRawUnsafe(
    `SELECT ${SELECT_COLUMNS}
     FROM tbl_payment_device_config
     WHERE config_id = $1
       AND COALESCE(is_delete, false) = false
     LIMIT 1`,
    configId,
  )) as any[];

  return records[0] ?? null;
}

export async function findDuplicatePaymentDevice(options: {
  storeCode: string;
  stationCode: string | null;
  payDeviceName: string;
  excludeId?: bigint;
}) {
  const delegate = getDelegate();
  if (delegate) {
    return delegate.findFirst({
      where: {
        payDeviceName: { equals: options.payDeviceName, mode: "insensitive" },
        storeCode: options.storeCode,
        stationCode: options.stationCode,
        isDelete: false,
        ...(options.excludeId ? { NOT: { configId: options.excludeId } } : {}),
      },
    });
  }

  const records = options.excludeId
    ? ((await prisma.$queryRawUnsafe(
        `SELECT ${SELECT_COLUMNS}
         FROM tbl_payment_device_config
         WHERE LOWER(pay_device_name) = LOWER($1)
           AND store_code = $2
           AND station_code = $3
           AND COALESCE(is_delete, false) = false
           AND config_id <> $4
         LIMIT 1`,
        options.payDeviceName,
        options.storeCode,
        options.stationCode,
        options.excludeId,
      )) as any[])
    : ((await prisma.$queryRawUnsafe(
        `SELECT ${SELECT_COLUMNS}
         FROM tbl_payment_device_config
         WHERE LOWER(pay_device_name) = LOWER($1)
           AND store_code = $2
           AND station_code = $3
           AND COALESCE(is_delete, false) = false
         LIMIT 1`,
        options.payDeviceName,
        options.storeCode,
        options.stationCode,
      )) as any[]);

  return records[0] ?? null;
}

export async function generatePayDeviceCode(storeCode: string) {
  const prefix = `WL${storeCode}PDC`;
  const delegate = getDelegate();
  const records = delegate
    ? await delegate.findMany({
        where: { payDeviceCode: { startsWith: prefix } },
        select: { payDeviceCode: true },
      })
    : ((await prisma.$queryRawUnsafe(
        `SELECT pay_device_code AS "payDeviceCode"
         FROM tbl_payment_device_config
         WHERE pay_device_code LIKE $1`,
        `${prefix}%`,
      )) as { payDeviceCode: string }[]);

  return `${prefix}${nextSequence(
    records.map((item: { payDeviceCode: string }) => item.payDeviceCode),
    prefix,
  )}`;
}

export type PaymentDeviceWriteData = {
  payDeviceName: string;
  payDeviceType: string;
  appId?: string | null;
  appKey?: string | null;
  epi?: string | null;
  ipAddress?: string | null;
  portNo?: number | null;
  isActive: boolean;
  isDeviceLive: boolean;
};

function withEnvConstants(data: PaymentDeviceWriteData) {
  const constants = getPaymentDeviceConstants(
    data.payDeviceType,
    data.isDeviceLive,
  );
  return {
    ...data,
    apiUrl: constants.apiUrl || null,
    chennelId: constants.channelId || null,
    isvKey: constants.isvKey || null,
  };
}

export async function createPaymentDevice(
  data: PaymentDeviceWriteData & {
    payDeviceCode: string;
    stationCode: string;
    storeCode: string;
    createdBy?: number;
  },
) {
  const payload = withEnvConstants(data);
  const delegate = getDelegate();
  if (delegate) {
    return delegate.create({
      data: {
        payDeviceCode: data.payDeviceCode,
        payDeviceName: payload.payDeviceName,
        payDeviceType: payload.payDeviceType,
        apiUrl: payload.apiUrl,
        appId: payload.appId || null,
        appKey: payload.appKey || null,
        epi: payload.epi || null,
        chennelId: payload.chennelId,
        ipAddress: payload.ipAddress || null,
        portNo: payload.portNo,
        isActive: payload.isActive,
        isDeviceLive: payload.isDeviceLive,
        isvKey: payload.isvKey,
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
    `INSERT INTO tbl_payment_device_config (
        pay_device_code,
        pay_device_name,
        api_url,
        app_id,
        app_key,
        epi,
        chennelid,
        ip_address,
        port_no,
        is_active,
        station_code,
        store_code,
        is_delete,
        createdby,
        createdon,
        is_sync_to_web,
        is_sync_to_local,
        sync_id,
        sync_source,
        pay_device_type,
        isv_key,
        is_device_live
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, $13,
        CURRENT_TIMESTAMP, 0, 0, $14::uuid, 'location', $15, $16, $17
      )
      RETURNING ${SELECT_COLUMNS}`,
    data.payDeviceCode,
    payload.payDeviceName,
    payload.apiUrl,
    payload.appId || null,
    payload.appKey || null,
    payload.epi || null,
    payload.chennelId,
    payload.ipAddress || null,
    payload.portNo,
    payload.isActive,
    data.stationCode,
    data.storeCode,
    data.createdBy ?? null,
    randomUUID(),
    payload.payDeviceType,
    payload.isvKey,
    payload.isDeviceLive,
  )) as any[];

  return records[0];
}

export async function updatePaymentDevice(
  configId: bigint,
  data: PaymentDeviceWriteData & { updatedBy?: number },
) {
  const payload = withEnvConstants(data);
  const delegate = getDelegate();
  if (delegate) {
    return delegate.update({
      where: { configId },
      data: {
        payDeviceName: payload.payDeviceName,
        payDeviceType: payload.payDeviceType,
        apiUrl: payload.apiUrl,
        appId: payload.appId || null,
        appKey: payload.appKey || null,
        epi: payload.epi || null,
        chennelId: payload.chennelId,
        ipAddress: payload.ipAddress || null,
        portNo: payload.portNo,
        isActive: payload.isActive,
        isDeviceLive: payload.isDeviceLive,
        isvKey: payload.isvKey,
        updatedBy: data.updatedBy,
        updatedOn: new Date(),
        isSyncToWeb: 0,
        isSyncToLocal: 0,
        syncSource: "location",
      },
    });
  }

  const records = (await prisma.$queryRawUnsafe(
    `UPDATE tbl_payment_device_config
     SET pay_device_name = $2,
         api_url = $3,
         app_id = $4,
         app_key = $5,
         epi = $6,
         chennelid = $7,
         ip_address = $8,
         port_no = $9,
         is_active = $10,
         updatedby = $11,
         updatedon = CURRENT_TIMESTAMP,
         is_sync_to_web = 0,
         is_sync_to_local = 0,
         sync_source = 'location',
         pay_device_type = $12,
         isv_key = $13,
         is_device_live = $14
     WHERE config_id = $1
     RETURNING ${SELECT_COLUMNS}`,
    configId,
    payload.payDeviceName,
    payload.apiUrl,
    payload.appId || null,
    payload.appKey || null,
    payload.epi || null,
    payload.chennelId,
    payload.ipAddress || null,
    payload.portNo,
    payload.isActive,
    data.updatedBy ?? null,
    payload.payDeviceType,
    payload.isvKey,
    payload.isDeviceLive,
  )) as any[];

  return records[0];
}

export async function softDeletePaymentDevice(
  configId: bigint,
  updatedBy?: number,
) {
  const delegate = getDelegate();
  if (delegate) {
    return delegate.update({
      where: { configId },
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
    `UPDATE tbl_payment_device_config
     SET is_delete = true,
         is_active = false,
         updatedby = $2,
         updatedon = CURRENT_TIMESTAMP,
         sync_source = 'location'
     WHERE config_id = $1`,
    configId,
    updatedBy ?? null,
  );
}
