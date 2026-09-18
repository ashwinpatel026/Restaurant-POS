export const PAY_DEVICE_TYPES = ["Valor Pay", "Pax"] as const;
export type PayDeviceType = (typeof PAY_DEVICE_TYPES)[number];

type PaymentDeviceEnvConstants = {
  apiUrl: string;
  channelId: string;
  isvKey: string;
};

export const PAYMENT_DEVICE_CONSTANTS: Record<
  PayDeviceType,
  { development: PaymentDeviceEnvConstants; live: PaymentDeviceEnvConstants }
> = {
  "Valor Pay": {
    development: {
      apiUrl: "https://securelink-staging.valorpaytech.com:4430/",
      channelId: "b129eb4a763095dc83fa7f916cb9fc92",
      isvKey: "KVrlz7@%Th7SsckH44@vDk0aSqwzK1$I",
    },
    live: {
      apiUrl: "https://securelink.valorpaytech.com:4430/",
      channelId: "0ed43d6bc07676f9d1d33345bfc20602",
      isvKey: "QAtfxi99EJ$DM%gtOfwF2DV%fJ0nzlns",
    },
  },
  Pax: {
    development: {
      apiUrl: "",
      channelId: "",
      isvKey: "",
    },
    live: {
      apiUrl: "",
      channelId: "",
      isvKey: "",
    },
  },
};

export function normalizePayDeviceType(value: unknown): PayDeviceType {
  return value === "Pax" ? "Pax" : "Valor Pay";
}

export function getPaymentDeviceConstants(
  deviceType: string,
  isLive: boolean,
): PaymentDeviceEnvConstants {
  const type = normalizePayDeviceType(deviceType);
  return isLive
    ? PAYMENT_DEVICE_CONSTANTS[type].live
    : PAYMENT_DEVICE_CONSTANTS[type].development;
}

export function maskPaymentSecret(value: string) {
  const text = value.trim();
  if (!text) return "-";
  if (text.length <= 8) {
    return `${text.slice(0, 4)}${"*".repeat(14)}${text.slice(4)}`;
  }
  return `${text.slice(0, 4)}${"*".repeat(14)}${text.slice(-4)}`;
}
