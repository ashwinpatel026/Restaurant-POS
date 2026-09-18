import { NextRequest, NextResponse } from 'next/server'
import { authenticatePOSRequest, addPOSSyncMetadata } from '@/lib/posApiHelper'
import { locationPrisma } from '@/lib/databaseManager'

export type PosStationSyncConfig = {
  modelName: string
  idField: string
  codeField: string
  entityLabel: string
  requiredCreate: string[]
  writableFields: string[]
  booleanFields?: string[]
  intFields?: string[]
  decimalFields?: string[]
  idIsInt?: boolean
}

function getDelegate(modelName: string) {
  const delegate = (locationPrisma as any)[modelName]
  if (!delegate) {
    throw new Error(
      `Prisma model ${modelName} is unavailable. Restart the app after prisma generate.`
    )
  }
  return delegate
}

function camelToSnake(field: string) {
  return field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

function getBodyValue(body: any, field: string) {
  if (body[field] !== undefined) return body[field]
  const snake = camelToSnake(field)
  if (body[snake] !== undefined) return body[snake]
  const lower = field.toLowerCase()
  if (body[lower] !== undefined) return body[lower]
  return undefined
}

export function serializePosRecord(record: any, idField: string) {
  if (!record) return record
  const out: any = { ...record }

  for (const key of Object.keys(out)) {
    const value = out[key]
    if (typeof value === 'bigint') {
      out[key] = value.toString()
    } else if (value instanceof Date) {
      out[key] = value.toISOString()
    } else if (value && typeof value === 'object' && typeof value.toNumber === 'function') {
      out[key] = Number(value.toString())
    }
  }

  if (out[idField] != null && typeof out[idField] !== 'string') {
    out[idField] = String(out[idField])
  }

  return out
}

function pickWritable(body: any, config: PosStationSyncConfig) {
  const data: any = {}
  const booleanFields = new Set(config.booleanFields || [])
  const intFields = new Set(config.intFields || [])
  const decimalFields = new Set(config.decimalFields || [])

  for (const field of config.writableFields) {
    const raw = getBodyValue(body, field)
    if (raw === undefined) continue

    if (booleanFields.has(field)) {
      data[field] = raw === true || raw === 1 || raw === '1' || raw === 'true'
      continue
    }

    if (intFields.has(field)) {
      data[field] = raw === null || raw === '' ? null : parseInt(String(raw), 10)
      continue
    }

    if (decimalFields.has(field)) {
      data[field] = raw === null || raw === '' ? 0 : parseFloat(String(raw))
      continue
    }

    data[field] = raw === '' ? null : raw
  }

  return data
}

function parseIdValue(id: string, idIsInt?: boolean) {
  if (!/^\d+$/.test(id)) return null
  return idIsInt ? Number(id) : BigInt(id)
}

async function findRecord(config: PosStationSyncConfig, storeCode: string, id: string) {
  const delegate = getDelegate(config.modelName)
  const idValue = parseIdValue(id, config.idIsInt)

  if (idValue != null) {
    const byId = await delegate.findFirst({
      where: {
        [config.idField]: idValue,
        storeCode,
        isDelete: false
      }
    })
    if (byId) return byId
  }

  return delegate.findFirst({
    where: {
      [config.codeField]: id,
      storeCode,
      isDelete: false
    }
  })
}

function authFailed(auth: { error?: string; status?: number }) {
  return NextResponse.json(
    { error: auth.error },
    { status: auth.status || 401 }
  )
}

export const PRINTER_PROFILE_SYNC: PosStationSyncConfig = {
  modelName: 'printerProfile',
  idField: 'profileId',
  codeField: 'profileCode',
  entityLabel: 'Printer profile',
  requiredCreate: ['profileCode', 'name', 'printerType'],
  writableFields: ['profileCode', 'name', 'printerType', 'isActive'],
  booleanFields: ['isActive']
}

export const STATION_PROFILE_SETTING_SYNC: PosStationSyncConfig = {
  modelName: 'stationProfileSetting',
  idField: 'profileSettingId',
  codeField: 'profileSettingCode',
  entityLabel: 'Station profile setting',
  requiredCreate: ['profileSettingCode', 'stationCode', 'profileCode'],
  writableFields: [
    'profileSettingCode',
    'stationCode',
    'profileCode',
    'localPrinterCode',
    'backupPrinterCode',
    'isActive'
  ],
  booleanFields: ['isActive']
}

export const STATION_SETTING_SYNC: PosStationSyncConfig = {
  modelName: 'stationSetting',
  idField: 'stationSettingId',
  codeField: 'stationCode',
  entityLabel: 'Station setting',
  idIsInt: true,
  requiredCreate: ['stationCode'],
  writableFields: [
    'stationCode',
    'theme',
    'isBurg',
    'burgComPort',
    'localPrinterCode',
    'backupPrinterCode',
    'isCashDrawer',
    'cashDrawerCode',
    'cashDrawerComport',
    'isBarcodeScanner',
    'liquorDispenserCode',
    'tabSelectionReqDin',
    'enableMobileKeyboard',
    'isAutoPicked',
    'isAutoDelivered',
    'openCheckSelection',
    'idealTimeLogout',
    'isTipAdjustmentReceipt',
    'fontSize',
    'isActive'
  ],
  booleanFields: [
    'isBurg',
    'isCashDrawer',
    'isBarcodeScanner',
    'tabSelectionReqDin',
    'enableMobileKeyboard',
    'isAutoPicked',
    'isAutoDelivered',
    'isTipAdjustmentReceipt',
    'isActive'
  ],
  intFields: ['fontSize']
}

export const EXTERNAL_PAY_SYNC: PosStationSyncConfig = {
  modelName: 'externalPayMaster',
  idField: 'externalPayId',
  codeField: 'externalPayCode',
  entityLabel: 'External pay',
  requiredCreate: ['externalPayCode'],
  writableFields: ['externalPayCode', 'externalPayName', 'stationCode', 'isActive'],
  booleanFields: ['isActive']
}

export const TENDER_TYPE_SYNC: PosStationSyncConfig = {
  modelName: 'tenderType',
  idField: 'tenderTypeId',
  codeField: 'tenderCode',
  entityLabel: 'Tender type',
  requiredCreate: ['tenderCode', 'tenderName'],
  writableFields: [
    'tenderCode',
    'tenderName',
    'tenderType',
    'deviceSelectionCode',
    'cashDrawerCode',
    'isActive',
    'displayOrder',
    'stationCode',
    'externalPayCode',
    'requiresDevice',
    'allowTip',
    'feeCode',
    'surchargePer',
    'preAuthAmount',
    'preAuthAllow',
    'signatureAllow',
    'taxExempt'
  ],
  booleanFields: [
    'isActive',
    'requiresDevice',
    'allowTip',
    'preAuthAllow',
    'signatureAllow',
    'taxExempt'
  ],
  intFields: ['displayOrder'],
  decimalFields: ['surchargePer', 'preAuthAmount']
}

export const PAYMENT_DEVICE_SYNC: PosStationSyncConfig = {
  modelName: 'paymentDeviceConfig',
  idField: 'configId',
  codeField: 'payDeviceCode',
  entityLabel: 'Payment device config',
  requiredCreate: ['payDeviceCode', 'payDeviceName'],
  writableFields: [
    'payDeviceCode',
    'payDeviceName',
    'apiUrl',
    'apiKey',
    'appId',
    'appKey',
    'epi',
    'chennelId',
    'ipAddress',
    'portNo',
    'isActive',
    'stationCode',
    'payDeviceType',
    'isvKey',
    'isDeviceLive'
  ],
  booleanFields: ['isActive', 'isDeviceLive'],
  intFields: ['portNo']
}

export const CASH_DRAWER_SYNC: PosStationSyncConfig = {
  modelName: 'cashDrawerMaster',
  idField: 'cashDrawerId',
  codeField: 'cashDrawerCode',
  entityLabel: 'Cash drawer',
  requiredCreate: ['cashDrawerCode'],
  writableFields: [
    'cashDrawerCode',
    'cashDrawerName',
    'comPort',
    'stationCode',
    'isActive',
    'connectionType',
    'printerCode'
  ],
  booleanFields: ['isActive']
}

export function createPosStationCollectionHandlers(config: PosStationSyncConfig) {
  return {
    GET: async (
      request: NextRequest,
      { params }: { params: Promise<{ storeCode: string }> }
    ) => {
      try {
        const { storeCode } = await params
        const auth = await authenticatePOSRequest(request, storeCode)
        if (!auth.success) return authFailed(auth)

        const url = new URL(request.url)
        const lastSyncAt = url.searchParams.get('lastSyncAt')
        const incremental = url.searchParams.get('incremental') === 'true'
        const where: any = { storeCode, isDelete: false }
        if (incremental && lastSyncAt) {
          where.updatedOn = { gte: new Date(lastSyncAt) }
        }

        const records = await getDelegate(config.modelName).findMany({
          where,
          orderBy: { createdOn: 'desc' }
        })

        return NextResponse.json({
          success: true,
          storeCode,
          count: records.length,
          data: records.map((record: any) => serializePosRecord(record, config.idField))
        })
      } catch (error: any) {
        console.error(`Error fetching ${config.entityLabel}s:`, error)
        return NextResponse.json(
          { error: 'Internal server error', message: error.message },
          { status: 500 }
        )
      }
    },

    POST: async (
      request: NextRequest,
      { params }: { params: Promise<{ storeCode: string }> }
    ) => {
      try {
        const { storeCode } = await params
        const auth = await authenticatePOSRequest(request, storeCode)
        if (!auth.success) return authFailed(auth)

        let body
        try {
          body = await request.json()
        } catch {
          return NextResponse.json(
            { error: 'Invalid JSON in request body' },
            { status: 400 }
          )
        }

        const payload = pickWritable(body, config)
        const missing = config.requiredCreate.filter((field) => !payload[field])
        if (missing.length > 0) {
          return NextResponse.json(
            { error: `${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} required` },
            { status: 400 }
          )
        }

        const delegate = getDelegate(config.modelName)
        const existing = await delegate.findFirst({
          where: { [config.codeField]: payload[config.codeField] }
        })
        if (existing) {
          return NextResponse.json(
            { error: `${config.entityLabel} with this code already exists` },
            { status: 409 }
          )
        }

        const created = await delegate.create({
          data: addPOSSyncMetadata({
            ...payload,
            createdBy: body.createdBy ? parseInt(String(body.createdBy), 10) : null,
            createdOn: new Date()
          }, storeCode)
        })

        return NextResponse.json({
          success: true,
          message: `${config.entityLabel} created successfully`,
          data: serializePosRecord(created, config.idField)
        }, { status: 201 })
      } catch (error: any) {
        console.error(`Error creating ${config.entityLabel}:`, error)
        return NextResponse.json(
          { error: 'Internal server error', message: error.message },
          { status: 500 }
        )
      }
    }
  }
}

export function createPosStationItemHandlers(config: PosStationSyncConfig) {
  return {
    GET: async (
      request: NextRequest,
      { params }: { params: Promise<{ storeCode: string; id: string }> }
    ) => {
      try {
        const { storeCode, id } = await params
        const auth = await authenticatePOSRequest(request, storeCode)
        if (!auth.success) return authFailed(auth)

        const record = await findRecord(config, storeCode, id)
        if (!record || record.storeCode !== storeCode) {
          return NextResponse.json(
            { error: `${config.entityLabel} not found` },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          data: serializePosRecord(record, config.idField)
        })
      } catch (error: any) {
        console.error(`Error fetching ${config.entityLabel}:`, error)
        return NextResponse.json(
          { error: 'Internal server error', message: error.message },
          { status: 500 }
        )
      }
    },

    PUT: async (
      request: NextRequest,
      { params }: { params: Promise<{ storeCode: string; id: string }> }
    ) => {
      try {
        const { storeCode, id } = await params
        const auth = await authenticatePOSRequest(request, storeCode)
        if (!auth.success) return authFailed(auth)

        let body
        try {
          body = await request.json()
        } catch {
          return NextResponse.json(
            { error: 'Invalid JSON in request body' },
            { status: 400 }
          )
        }

        const existing = await findRecord(config, storeCode, id)
        if (!existing || existing.storeCode !== storeCode) {
          return NextResponse.json(
            { error: `${config.entityLabel} not found` },
            { status: 404 }
          )
        }

        const payload = pickWritable(body, config)
        if (payload[config.codeField] && payload[config.codeField] !== existing[config.codeField]) {
          const conflict = await getDelegate(config.modelName).findFirst({
            where: { [config.codeField]: payload[config.codeField] }
          })
          if (conflict && String(conflict[config.idField]) !== String(existing[config.idField])) {
            return NextResponse.json(
              { error: `${config.entityLabel} with this code already exists` },
              { status: 409 }
            )
          }
        }

        const updateData = addPOSSyncMetadata({
          ...payload,
          updatedBy: body.updatedBy ? parseInt(String(body.updatedBy), 10) : null
        }, storeCode)
        updateData.syncId = existing.syncId

        const updated = await getDelegate(config.modelName).update({
          where: { [config.idField]: existing[config.idField] },
          data: updateData
        })

        return NextResponse.json({
          success: true,
          message: `${config.entityLabel} updated successfully`,
          data: serializePosRecord(updated, config.idField)
        })
      } catch (error: any) {
        console.error(`Error updating ${config.entityLabel}:`, error)
        return NextResponse.json(
          { error: 'Internal server error', message: error.message },
          { status: 500 }
        )
      }
    },

    DELETE: async (
      request: NextRequest,
      { params }: { params: Promise<{ storeCode: string; id: string }> }
    ) => {
      try {
        const { storeCode, id } = await params
        const auth = await authenticatePOSRequest(request, storeCode)
        if (!auth.success) return authFailed(auth)

        const existing = await findRecord(config, storeCode, id)
        if (!existing || existing.storeCode !== storeCode) {
          return NextResponse.json(
            { error: `${config.entityLabel} not found` },
            { status: 404 }
          )
        }

        await getDelegate(config.modelName).update({
          where: { [config.idField]: existing[config.idField] },
          data: addPOSSyncMetadata({
            isDelete: true,
            isActive: false,
            syncId: existing.syncId
          }, storeCode)
        })

        return NextResponse.json({
          success: true,
          message: `${config.entityLabel} deleted successfully`,
          data: {
            [config.codeField]: existing[config.codeField],
            [config.idField]: String(existing[config.idField])
          }
        })
      } catch (error: any) {
        console.error(`Error deleting ${config.entityLabel}:`, error)
        return NextResponse.json(
          { error: 'Internal server error', message: error.message },
          { status: 500 }
        )
      }
    }
  }
}
