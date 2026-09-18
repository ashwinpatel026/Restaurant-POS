function firstDefined(...values: any[]) {
  for (const value of values) {
    if (value !== undefined) return value
  }
  return undefined
}

export function characterPerLineForMethod(printMethod: string): number {
  return printMethod === '2' ? 40 : 48
}

function normalizePrintMethod(value: any): string {
  return String(value) === '2' ? '2' : '1'
}

function toOptionalString(value: any): string | null {
  if (value === undefined || value === null) return null
  const trimmed = String(value).trim()
  return trimmed ? trimmed : null
}

function toInteger(value: any, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (value === undefined || value === null || value === '') return fallback
  const parsed = parseInt(String(value), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toBoolean(value: any, fallback = false): boolean {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true
    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false
  }
  return Boolean(value)
}

export function parsePrinterFields(body: any) {
  const printMethod = normalizePrintMethod(
    firstDefined(body.printMethod, body.print_method, '1')
  )
  const isSerial = toBoolean(firstDefined(body.isSerial, body.is_serial), false)
  const characterPerLine = toInteger(
    firstDefined(body.characterPerLine, body.character_per_line),
    characterPerLineForMethod(printMethod)
  )
  const printerName = firstDefined(body.printerName, body.printer_name)

  return {
    printerName,
    isActive: toBoolean(firstDefined(body.isActive, body.is_active), true) ? 1 : 0,
    isreceipt: toBoolean(firstDefined(body.isreceipt, body.is_receipt), false),
    isdocument: toBoolean(firstDefined(body.isdocument, body.is_document), false),
    isKitchen: toBoolean(firstDefined(body.isKitchen, body.is_kitchen), false),
    isSerial,
    comport: isSerial
      ? toOptionalString(firstDefined(body.comport, body.comPort, body.com_port))
      : null,
    ipAdress: toOptionalString(firstDefined(body.ipAdress, body.ip_adress, body.ipAddress, body.ip_address)),
    printMethod,
    characterPerLine,
    colPreChar: toInteger(
      firstDefined(body.colPreChar, body.col_pre_char),
      characterPerLine
    ),
    displayName:
      toOptionalString(firstDefined(body.displayName, body.display_name)) ||
      toOptionalString(printerName),
    printerBrand: firstDefined(body.printerBrand, body.printer_brand) ?? '',
    stationCode: toOptionalString(firstDefined(body.stationCode, body.station_code)),
    isDelete: toBoolean(firstDefined(body.isDelete, body.is_delete), false),
  }
}

export function applyPrinterFieldUpdates(body: any, updateData: Record<string, any>) {
  if (firstDefined(body.printerName, body.printer_name) !== undefined) {
    updateData.printerName = firstDefined(body.printerName, body.printer_name)
  }
  if (firstDefined(body.isActive, body.is_active) !== undefined) {
    updateData.isActive = toBoolean(firstDefined(body.isActive, body.is_active), true) ? 1 : 0
  }
  if (firstDefined(body.isreceipt, body.is_receipt) !== undefined) {
    updateData.isreceipt = toBoolean(firstDefined(body.isreceipt, body.is_receipt), false)
  }
  if (firstDefined(body.isdocument, body.is_document) !== undefined) {
    updateData.isdocument = toBoolean(firstDefined(body.isdocument, body.is_document), false)
  }
  if (firstDefined(body.isKitchen, body.is_kitchen) !== undefined) {
    updateData.isKitchen = toBoolean(firstDefined(body.isKitchen, body.is_kitchen), false)
  }
  if (firstDefined(body.isSerial, body.is_serial) !== undefined) {
    updateData.isSerial = toBoolean(firstDefined(body.isSerial, body.is_serial), false)
    if (!updateData.isSerial) {
      updateData.comport = null
    }
  }
  if (firstDefined(body.comport, body.comPort, body.com_port) !== undefined) {
    updateData.comport = toOptionalString(firstDefined(body.comport, body.comPort, body.com_port))
  }
  if (firstDefined(body.ipAdress, body.ip_adress, body.ipAddress, body.ip_address) !== undefined) {
    updateData.ipAdress = toOptionalString(
      firstDefined(body.ipAdress, body.ip_adress, body.ipAddress, body.ip_address)
    )
  }
  if (firstDefined(body.printMethod, body.print_method) !== undefined) {
    updateData.printMethod = normalizePrintMethod(firstDefined(body.printMethod, body.print_method))
    if (firstDefined(body.characterPerLine, body.character_per_line) === undefined) {
      updateData.characterPerLine = characterPerLineForMethod(updateData.printMethod)
      updateData.colPreChar = updateData.characterPerLine
    }
  }
  if (firstDefined(body.characterPerLine, body.character_per_line) !== undefined) {
    const printMethod = updateData.printMethod
      ? normalizePrintMethod(updateData.printMethod)
      : normalizePrintMethod(firstDefined(body.printMethod, body.print_method, '1'))
    updateData.characterPerLine = toInteger(
      firstDefined(body.characterPerLine, body.character_per_line),
      characterPerLineForMethod(printMethod)
    )
  }
  if (firstDefined(body.colPreChar, body.col_pre_char) !== undefined) {
    updateData.colPreChar = toInteger(
      firstDefined(body.colPreChar, body.col_pre_char),
      updateData.characterPerLine ?? 40
    )
  }
  if (firstDefined(body.displayName, body.display_name) !== undefined) {
    updateData.displayName = toOptionalString(firstDefined(body.displayName, body.display_name))
  }
  if (firstDefined(body.printerBrand, body.printer_brand) !== undefined) {
    updateData.printerBrand = firstDefined(body.printerBrand, body.printer_brand) ?? ''
  }
  if (firstDefined(body.stationCode, body.station_code) !== undefined) {
    updateData.stationCode = toOptionalString(firstDefined(body.stationCode, body.station_code))
  }
  if (firstDefined(body.isDelete, body.is_delete) !== undefined) {
    updateData.isDelete = toBoolean(firstDefined(body.isDelete, body.is_delete), false)
  }
}

export function serializePrinter(printer: any) {
  return {
    ...printer,
    printerId: printer.printerId?.toString?.() ?? printer.printerId,
    createdBy:
      printer.createdBy !== undefined && printer.createdBy !== null
        ? printer.createdBy.toString()
        : null,
    updatedBy:
      printer.updatedBy !== undefined && printer.updatedBy !== null
        ? printer.updatedBy.toString()
        : null,
  }
}
