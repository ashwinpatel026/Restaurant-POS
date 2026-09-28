"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import toast from "react-hot-toast";
import { useApiWithStore } from "@/hooks/useApiWithStore";
import StatusToggle from "@/components/forms/StatusToggle";
import CRUDModal from "@/components/modals/CRUDModal";
import DeleteConfirmationModal from "@/components/modals/DeleteConfirmationModal";
import { MoonIcon, PencilIcon, SunIcon } from "@heroicons/react/24/outline";
import {
  getPaymentDeviceConstants,
  maskPaymentSecret,
  PAY_DEVICE_TYPES,
} from "@/lib/paymentDeviceConstants";

const FONT_SIZES = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24];
const ORDER_TYPES = ["Dine-In", "To Go", "Delivery"] as const;
const TENDER_TYPES = ["Cash", "Card", "Gift Card", "External Pay"] as const;
const CASH_DRAWER_CONNECTION_TYPES = ["Printer", "Comport"] as const;

const STATION_TABS = [
  { id: "general", label: "General Settings" },
  { id: "liquor", label: "Liquor Dispenser" },
  { id: "printer", label: "Printer" },
  { id: "tender", label: "Tender" },
  { id: "cash-drawer", label: "Cash Drawer" },
] as const;

type StationTabId = (typeof STATION_TABS)[number]["id"];

interface StationOption {
  stationCode: string;
  stationname: string | null;
  isActive: number | null;
}

interface PrinterOption {
  printerCode: string;
  printerName: string;
}

interface StationPrinterRow {
  profileId: string;
  profileCode: string;
  profileName: string;
  printerType: string;
  profileSettingId: string | null;
  localPrinterCode: string;
  backupPrinterCode: string;
}

interface ExternalPayTender {
  externalPayId: string;
  externalPayCode?: string;
  externalPayName: string | null;
  isActive: boolean;
}

interface TenderRow {
  tenderTypeId: string;
  tenderName: string;
  tenderType: string | null;
  deviceSelectionCode: string | null;
  cashDrawerCode: string | null;
  isActive: boolean;
  displayOrder: number;
  externalPayCode: string | null;
  allowTip: boolean;
  feeCode: string | null;
  preAuthAmount: number;
  preAuthAllow: boolean;
  signatureAllow: boolean;
  taxExempt: boolean;
}

interface TenderLookupFee {
  feeCode: string;
  feeName: string | null;
}

interface TenderCashDrawer {
  cashDrawerCode: string;
  cashDrawerName?: string | null;
  stationCode?: string | null;
  comPort?: string | null;
}

interface TenderPaymentDevice {
  payDeviceCode: string;
  payDeviceName: string | null;
  payDeviceType?: string | null;
  isActive?: boolean;
}

interface PaymentDeviceRow {
  configId: string;
  payDeviceCode?: string;
  payDeviceName: string;
  payDeviceType: string | null;
  appId: string | null;
  appKey: string | null;
  epi: string | null;
  ipAddress: string | null;
  portNo: number | null;
  isActive: boolean;
  isDeviceLive: boolean;
}

interface CashDrawerRow {
  cashDrawerId: string;
  cashDrawerCode: string;
  cashDrawerName: string | null;
  comPort: string | null;
  connectionType: string | null;
  printerCode: string | null;
  isActive: boolean;
}

const EMPTY_CASH_DRAWER_FORM = {
  cashDrawerName: "",
  connectionType: "Comport",
  printerCode: "",
  comPort: "",
  isActive: true,
};

const EMPTY_TENDER_FORM = {
  tenderName: "",
  tenderType: "Cash",
  deviceSelectionCode: "",
  cashDrawerCode: "",
  isActive: true,
  displayOrder: "0",
  feeCode: "",
  preAuthAmount: "0",
  allowTip: false,
  preAuthAllow: false,
  signatureAllow: false,
  taxExempt: false,
  externalPayCode: "",
};

const EMPTY_PAYMENT_DEVICE_FORM = {
  payDeviceName: "",
  payDeviceType: "Valor Pay",
  appId: "",
  appKey: "",
  epi: "",
  ipAddress: "",
  portNo: "",
  isActive: true,
  isDeviceLive: false,
};

interface StationSettingForm {
  theme: string;
  isBurg: boolean;
  burgComPort: string;
  localPrinterCode: string;
  backupPrinterCode: string;
  isCashDrawer: boolean;
  cashDrawerCode: string;
  cashDrawerComport: string;
  isBarcodeScanner: boolean;
  liquorDispenserCode: string;
  tabSelectionReqDin: boolean;
  enableMobileKeyboard: boolean;
  isAutoPicked: boolean;
  isAutoDelivered: boolean;
  openCheckSelection: string;
  idealTimeLogout: string;
  isTipAdjustmentReceipt: boolean;
  fontSize: number;
}

const DEFAULT_STATION_SETTINGS: StationSettingForm = {
  theme: "Dark",
  isBurg: false,
  burgComPort: "",
  localPrinterCode: "",
  backupPrinterCode: "",
  isCashDrawer: false,
  cashDrawerCode: "",
  cashDrawerComport: "",
  isBarcodeScanner: false,
  liquorDispenserCode: "",
  tabSelectionReqDin: false,
  enableMobileKeyboard: false,
  isAutoPicked: false,
  isAutoDelivered: false,
  openCheckSelection: "Dine-In",
  idealTimeLogout: "0",
  isTipAdjustmentReceipt: true,
  fontSize: 13,
};

const selectClassName =
  "mt-1 block w-full max-w-md rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white";

const tableSelectClassName =
  "block w-full min-w-[10rem] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white";

const modalInputClassName =
  "block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white";

export default function StationSettingsPage() {
  const { selectedStoreCode, fetchWithStore } = useApiWithStore();
  const [activeTab, setActiveTab] = useState<StationTabId>("general");
  const [stations, setStations] = useState<StationOption[]>([]);
  const [selectedStationCode, setSelectedStationCode] = useState("");
  const [stationsLoading, setStationsLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<StationSettingForm>(DEFAULT_STATION_SETTINGS);
  const [printers, setPrinters] = useState<PrinterOption[]>([]);
  const [printerRows, setPrinterRows] = useState<StationPrinterRow[]>([]);
  const [printerLoading, setPrinterLoading] = useState(false);
  const [tenders, setTenders] = useState<TenderRow[]>([]);
  const [tenderFees, setTenderFees] = useState<TenderLookupFee[]>([]);
  const [tenderCashDrawers, setTenderCashDrawers] = useState<TenderCashDrawer[]>(
    [],
  );
  const [tenderExternalPays, setTenderExternalPays] = useState<
    ExternalPayTender[]
  >([]);
  const [tenderPaymentDevices, setTenderPaymentDevices] = useState<
    TenderPaymentDevice[]
  >([]);
  const [tenderLoading, setTenderLoading] = useState(false);
  const [tenderModalOpen, setTenderModalOpen] = useState(false);
  const [externalPayModalOpen, setExternalPayModalOpen] = useState(false);
  const [externalPayView, setExternalPayView] = useState<"list" | "form">(
    "list",
  );
  const [editingTender, setEditingTender] = useState<TenderRow | null>(null);
  const [tenderForm, setTenderForm] = useState(EMPTY_TENDER_FORM);
  const [editingExternalPay, setEditingExternalPay] =
    useState<ExternalPayTender | null>(null);
  const [externalPayForm, setExternalPayForm] = useState({
    externalPayName: "",
    isActive: true,
  });
  const [tenderToDelete, setTenderToDelete] = useState<ExternalPayTender | null>(
    null,
  );
  const [paymentDevices, setPaymentDevices] = useState<PaymentDeviceRow[]>([]);
  const [paymentDeviceModalOpen, setPaymentDeviceModalOpen] = useState(false);
  const [paymentDeviceView, setPaymentDeviceView] = useState<"list" | "form">(
    "list",
  );
  const [editingPaymentDevice, setEditingPaymentDevice] =
    useState<PaymentDeviceRow | null>(null);
  const [paymentDeviceForm, setPaymentDeviceForm] = useState(
    EMPTY_PAYMENT_DEVICE_FORM,
  );
  const [paymentDeviceToDelete, setPaymentDeviceToDelete] =
    useState<PaymentDeviceRow | null>(null);
  const [cashDrawers, setCashDrawers] = useState<CashDrawerRow[]>([]);
  const [cashDrawerPrinters, setCashDrawerPrinters] = useState<PrinterOption[]>(
    [],
  );
  const [cashDrawerModalOpen, setCashDrawerModalOpen] = useState(false);
  const [cashDrawerView, setCashDrawerView] = useState<"list" | "form">("list");
  const [editingCashDrawer, setEditingCashDrawer] =
    useState<CashDrawerRow | null>(null);
  const [cashDrawerForm, setCashDrawerForm] = useState(EMPTY_CASH_DRAWER_FORM);
  const [cashDrawerToDelete, setCashDrawerToDelete] =
    useState<CashDrawerRow | null>(null);

  const activeTabLabel =
    STATION_TABS.find((tab) => tab.id === activeTab)?.label ?? "Settings";
  const selectedStation = stations.find(
    (station) => station.stationCode === selectedStationCode,
  );
  const paymentDeviceEnv = getPaymentDeviceConstants(
    paymentDeviceForm.payDeviceType,
    paymentDeviceForm.isDeviceLive,
  );

  useEffect(() => {
    let isMounted = true;

    const loadStations = async () => {
      if (!selectedStoreCode) {
        setStations([]);
        setSelectedStationCode("");
        setStationsLoading(false);
        return;
      }

      try {
        setStationsLoading(true);
        setSelectedStationCode("");
        setForm(DEFAULT_STATION_SETTINGS);
        setPrinters([]);
        setPrinterRows([]);
        setTenders([]);
        setTenderFees([]);
        setTenderCashDrawers([]);
        setTenderExternalPays([]);
        setTenderPaymentDevices([]);
        setPaymentDevices([]);
        setCashDrawers([]);
        setCashDrawerPrinters([]);

        const response = await fetchWithStore(
          "/api/dashboard/settings/station",
          { cache: "no-store" },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || "Failed to load stations");
        }

        const data = await response.json();
        if (!isMounted) return;

        setStations(Array.isArray(data.stations) ? data.stations : []);
      } catch (error) {
        if (!isMounted) return;
        setStations([]);
        toast.error(
          error instanceof Error ? error.message : "Failed to load stations",
        );
      } finally {
        if (isMounted) {
          setStationsLoading(false);
        }
      }
    };

    loadStations();

    return () => {
      isMounted = false;
    };
  }, [selectedStoreCode]);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      if (!selectedStationCode) {
        setForm(DEFAULT_STATION_SETTINGS);
        return;
      }

      try {
        setSettingsLoading(true);
        const response = await fetchWithStore(
          `/api/dashboard/settings/station?stationCode=${encodeURIComponent(selectedStationCode)}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || "Failed to load station settings");
        }

        const data = await response.json();
        if (!isMounted) return;

        setForm({
          ...DEFAULT_STATION_SETTINGS,
          ...(data.setting ?? {}),
          theme:
            String(data.setting?.theme ?? "").toLowerCase() === "light"
              ? "Light"
              : "Dark",
          fontSize: Number(data.setting?.fontSize ?? 13) || 13,
          idealTimeLogout: String(data.setting?.idealTimeLogout ?? "0"),
        });
      } catch (error) {
        if (!isMounted) return;
        setForm(DEFAULT_STATION_SETTINGS);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load station settings",
        );
      } finally {
        if (isMounted) {
          setSettingsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [selectedStationCode]);

  useEffect(() => {
    let isMounted = true;

    const loadPrinterSettings = async () => {
      if (!selectedStationCode || activeTab !== "printer") {
        return;
      }

      try {
        setPrinterLoading(true);
        const response = await fetchWithStore(
          `/api/dashboard/settings/station/printer?stationCode=${encodeURIComponent(selectedStationCode)}`,
          { cache: "no-store" },
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load printer settings");
        }
        if (!isMounted) return;

        setPrinters(Array.isArray(payload?.printers) ? payload.printers : []);
        setPrinterRows(Array.isArray(payload?.rows) ? payload.rows : []);
      } catch (error) {
        if (!isMounted) return;
        setPrinters([]);
        setPrinterRows([]);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load printer settings",
        );
      } finally {
        if (isMounted) {
          setPrinterLoading(false);
        }
      }
    };

    loadPrinterSettings();

    return () => {
      isMounted = false;
    };
  }, [selectedStationCode, activeTab]);

  useEffect(() => {
    let isMounted = true;

    const loadTenders = async () => {
      if (!selectedStationCode || activeTab !== "tender") {
        return;
      }

      try {
        setTenderLoading(true);
        const response = await fetchWithStore(
          `/api/dashboard/settings/station/tender?stationCode=${encodeURIComponent(selectedStationCode)}`,
          { cache: "no-store" },
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load tenders");
        }
        if (!isMounted) return;
        setTenders(Array.isArray(payload?.tenders) ? payload.tenders : []);
        setTenderFees(Array.isArray(payload?.fees) ? payload.fees : []);
        setTenderCashDrawers(
          Array.isArray(payload?.cashDrawers) ? payload.cashDrawers : [],
        );
        setTenderExternalPays(
          Array.isArray(payload?.externalPays) ? payload.externalPays : [],
        );
        setTenderPaymentDevices(
          Array.isArray(payload?.paymentDevices) ? payload.paymentDevices : [],
        );
      } catch (error) {
        if (!isMounted) return;
        setTenders([]);
        toast.error(
          error instanceof Error ? error.message : "Failed to load tenders",
        );
      } finally {
        if (isMounted) {
          setTenderLoading(false);
        }
      }
    };

    loadTenders();

    return () => {
      isMounted = false;
    };
  }, [selectedStationCode, activeTab]);

  useEffect(() => {
    let isMounted = true;

    const loadCashDrawers = async () => {
      if (!selectedStationCode || activeTab !== "cash-drawer") {
        return;
      }

      try {
        const response = await fetchWithStore(
          `/api/dashboard/settings/station/cash-drawer?stationCode=${encodeURIComponent(selectedStationCode)}`,
          { cache: "no-store" },
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load cash drawers");
        }
        if (!isMounted) return;
        setCashDrawers(Array.isArray(payload?.drawers) ? payload.drawers : []);
        setCashDrawerPrinters(
          Array.isArray(payload?.printers) ? payload.printers : [],
        );
      } catch (error) {
        if (!isMounted) return;
        setCashDrawers([]);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load cash drawers",
        );
      }
    };

    loadCashDrawers();

    return () => {
      isMounted = false;
    };
  }, [selectedStationCode, activeTab]);

  const updateForm = <K extends keyof StationSettingForm>(
    key: K,
    value: StationSettingForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const getTabPayload = () => {
    if (activeTab === "general") {
      return {
        theme: form.theme,
        fontSize: form.fontSize,
        idealTimeLogout: form.idealTimeLogout,
        tabSelectionReqDin: form.tabSelectionReqDin,
        isBarcodeScanner: form.isBarcodeScanner,
        enableMobileKeyboard: form.enableMobileKeyboard,
        isTipAdjustmentReceipt: form.isTipAdjustmentReceipt,
        isAutoPicked: form.isAutoPicked,
        isAutoDelivered: form.isAutoDelivered,
        openCheckSelection: form.openCheckSelection,
      };
    }

    if (activeTab === "liquor") {
      return {
        isBurg: form.isBurg,
      };
    }

    if (activeTab === "cash-drawer") {
      const selectedDrawer = cashDrawers.find(
        (drawer) => drawer.cashDrawerCode === form.cashDrawerCode,
      );
      return {
        isCashDrawer: form.isCashDrawer,
        cashDrawerCode: form.isCashDrawer ? form.cashDrawerCode : "",
        cashDrawerComport: form.isCashDrawer
          ? selectedDrawer?.comPort || form.cashDrawerComport || ""
          : "",
      };
    }

    return {};
  };

  const updatePrinterRow = (
    profileCode: string,
    field: "localPrinterCode" | "backupPrinterCode",
    value: string,
  ) => {
    setPrinterRows((prev) =>
      prev.map((row) =>
        row.profileCode === profileCode ? { ...row, [field]: value } : row,
      ),
    );
  };

  const refreshTenders = async () => {
    if (!selectedStationCode) return;
    const refresh = await fetchWithStore(
      `/api/dashboard/settings/station/tender?stationCode=${encodeURIComponent(selectedStationCode)}`,
      { cache: "no-store" },
    );
    const refreshPayload = await refresh.json().catch(() => null);
    if (refresh.ok) {
      setTenders(
        Array.isArray(refreshPayload?.tenders) ? refreshPayload.tenders : [],
      );
      setTenderFees(Array.isArray(refreshPayload?.fees) ? refreshPayload.fees : []);
      setTenderCashDrawers(
        Array.isArray(refreshPayload?.cashDrawers)
          ? refreshPayload.cashDrawers
          : [],
      );
      setTenderExternalPays(
        Array.isArray(refreshPayload?.externalPays)
          ? refreshPayload.externalPays
          : [],
      );
      setTenderPaymentDevices(
        Array.isArray(refreshPayload?.paymentDevices)
          ? refreshPayload.paymentDevices
          : [],
      );
    }
  };

  const openTenderModal = (tender?: TenderRow | null) => {
    setEditingTender(tender ?? null);
    setTenderForm(
      tender
        ? {
            tenderName: tender.tenderName || "",
            tenderType: tender.tenderType || "Cash",
            deviceSelectionCode: tender.deviceSelectionCode || "",
            cashDrawerCode: tender.cashDrawerCode || "",
            isActive: tender.isActive !== false,
            displayOrder: String(tender.displayOrder ?? 0),
            feeCode: tender.feeCode || "",
            preAuthAmount: String(tender.preAuthAmount ?? 0),
            allowTip: tender.allowTip === true,
            preAuthAllow: tender.preAuthAllow === true,
            signatureAllow: tender.signatureAllow === true,
            taxExempt: tender.taxExempt === true,
            externalPayCode: tender.externalPayCode || "",
          }
        : EMPTY_TENDER_FORM,
    );
    setTenderModalOpen(true);
  };

  const openExternalPayModal = () => {
    setExternalPayView("list");
    setEditingExternalPay(null);
    setExternalPayForm({
      externalPayName: "",
      isActive: true,
    });
    setExternalPayModalOpen(true);
  };

  const openExternalPayForm = (tender?: ExternalPayTender | null) => {
    setEditingExternalPay(tender ?? null);
    setExternalPayForm({
      externalPayName: tender?.externalPayName || "",
      isActive: tender?.isActive !== false,
    });
    setExternalPayView("form");
  };

  const handleSaveTender = async () => {
    if (!selectedStationCode) {
      toast.error("Select a station first");
      return;
    }

    if (!tenderForm.tenderName.trim()) {
      toast.error("Tender name is required");
      return;
    }

    if (tenderForm.tenderType === "Card" && !tenderForm.deviceSelectionCode) {
      toast.error("Payment device is required for Card tenders");
      return;
    }

    try {
      setSaving(true);
      const url = editingTender
        ? `/api/dashboard/settings/station/tender/${editingTender.tenderTypeId}`
        : "/api/dashboard/settings/station/tender";
      const response = await fetchWithStore(url, {
        method: editingTender ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationCode: selectedStationCode,
          ...tenderForm,
          displayOrder: Number.parseInt(tenderForm.displayOrder, 10) || 0,
          preAuthAmount: Number(tenderForm.preAuthAmount) || 0,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save tender");
      }

      toast.success(editingTender ? "Tender updated" : "Tender added");
      setTenderModalOpen(false);
      setEditingTender(null);
      await refreshTenders();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save tender",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveExternalPay = async () => {
    if (!selectedStationCode) {
      toast.error("Select a station first");
      return;
    }

    try {
      setSaving(true);
      const url = editingExternalPay
        ? `/api/dashboard/settings/station/external-pay/${editingExternalPay.externalPayId}`
        : "/api/dashboard/settings/station/external-pay";
      const response = await fetchWithStore(url, {
        method: editingExternalPay ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationCode: selectedStationCode,
          ...externalPayForm,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save external payment");
      }

      toast.success(
        editingExternalPay ? "External payment updated" : "External payment added",
      );
      setEditingExternalPay(null);
      setExternalPayView("list");
      await refreshTenders();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save external payment",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTender = async () => {
    if (!tenderToDelete) return;

    try {
      setSaving(true);
      const response = await fetchWithStore(
        `/api/dashboard/settings/station/external-pay/${tenderToDelete.externalPayId}`,
        { method: "DELETE" },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to delete tender");
      }
      toast.success("External payment deleted");
      setTenderToDelete(null);
      await refreshTenders();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete tender",
      );
    } finally {
      setSaving(false);
    }
  };

  const refreshPaymentDevices = async () => {
    if (!selectedStationCode) return;
    const refresh = await fetchWithStore(
      `/api/dashboard/settings/station/payment-device?stationCode=${encodeURIComponent(selectedStationCode)}`,
      { cache: "no-store" },
    );
    const refreshPayload = await refresh.json().catch(() => null);
    if (refresh.ok) {
      setPaymentDevices(
        Array.isArray(refreshPayload?.devices) ? refreshPayload.devices : [],
      );
      setTenderPaymentDevices(
        Array.isArray(refreshPayload?.devices) ? refreshPayload.devices : [],
      );
    }
  };

  const openPaymentDeviceModal = async () => {
    setPaymentDeviceView("list");
    setEditingPaymentDevice(null);
    setPaymentDeviceForm(EMPTY_PAYMENT_DEVICE_FORM);
    setPaymentDeviceModalOpen(true);
    await refreshPaymentDevices();
  };

  const openPaymentDeviceForm = (device?: PaymentDeviceRow | null) => {
    setEditingPaymentDevice(device ?? null);
    setPaymentDeviceForm(
      device
        ? {
            payDeviceName: device.payDeviceName || "",
            payDeviceType:
              device.payDeviceType === "Pax" ? "Pax" : "Valor Pay",
            appId: device.appId || "",
            appKey: device.appKey || "",
            epi: device.epi || "",
            ipAddress: device.ipAddress || "",
            portNo: device.portNo == null ? "" : String(device.portNo),
            isActive: device.isActive !== false,
            isDeviceLive: device.isDeviceLive === true,
          }
        : EMPTY_PAYMENT_DEVICE_FORM,
    );
    setPaymentDeviceView("form");
  };

  const handleSavePaymentDevice = async () => {
    if (!selectedStationCode) {
      toast.error("Select a station first");
      return;
    }

    if (!paymentDeviceForm.payDeviceName.trim()) {
      toast.error("Device name is required");
      return;
    }

    try {
      setSaving(true);
      const url = editingPaymentDevice
        ? `/api/dashboard/settings/station/payment-device/${editingPaymentDevice.configId}`
        : "/api/dashboard/settings/station/payment-device";
      const response = await fetchWithStore(url, {
        method: editingPaymentDevice ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationCode: selectedStationCode,
          ...paymentDeviceForm,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save payment device");
      }

      toast.success(
        editingPaymentDevice ? "Payment device updated" : "Payment device added",
      );
      setEditingPaymentDevice(null);
      setPaymentDeviceView("list");
      await refreshPaymentDevices();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save payment device",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePaymentDevice = async () => {
    if (!paymentDeviceToDelete) return;

    try {
      setSaving(true);
      const response = await fetchWithStore(
        `/api/dashboard/settings/station/payment-device/${paymentDeviceToDelete.configId}`,
        { method: "DELETE" },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to delete payment device");
      }
      toast.success("Payment device deleted");
      setPaymentDeviceToDelete(null);
      await refreshPaymentDevices();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete payment device",
      );
    } finally {
      setSaving(false);
    }
  };

  const refreshCashDrawers = async () => {
    if (!selectedStationCode) return;
    const refresh = await fetchWithStore(
      `/api/dashboard/settings/station/cash-drawer?stationCode=${encodeURIComponent(selectedStationCode)}`,
      { cache: "no-store" },
    );
    const refreshPayload = await refresh.json().catch(() => null);
    if (refresh.ok) {
      setCashDrawers(
        Array.isArray(refreshPayload?.drawers) ? refreshPayload.drawers : [],
      );
      setCashDrawerPrinters(
        Array.isArray(refreshPayload?.printers) ? refreshPayload.printers : [],
      );
    }
  };

  const openCashDrawerModal = async () => {
    setCashDrawerView("list");
    setEditingCashDrawer(null);
    setCashDrawerForm(EMPTY_CASH_DRAWER_FORM);
    setCashDrawerModalOpen(true);
    await refreshCashDrawers();
  };

  const openCashDrawerForm = (drawer?: CashDrawerRow | null) => {
    setEditingCashDrawer(drawer ?? null);
    setCashDrawerForm(
      drawer
        ? {
            cashDrawerName: drawer.cashDrawerName || "",
            connectionType:
              drawer.connectionType === "Printer" ? "Printer" : "Comport",
            printerCode: drawer.printerCode || "",
            comPort: drawer.comPort || "",
            isActive: drawer.isActive !== false,
          }
        : EMPTY_CASH_DRAWER_FORM,
    );
    setCashDrawerView("form");
  };

  const handleSaveCashDrawerMaster = async () => {
    if (!selectedStationCode) {
      toast.error("Select a station first");
      return;
    }

    if (!cashDrawerForm.cashDrawerName.trim()) {
      toast.error("Cash drawer name is required");
      return;
    }

    if (cashDrawerForm.connectionType === "Printer" && !cashDrawerForm.printerCode) {
      toast.error("Select a printer");
      return;
    }

    try {
      setSaving(true);
      const url = editingCashDrawer
        ? `/api/dashboard/settings/station/cash-drawer/${editingCashDrawer.cashDrawerId}`
        : "/api/dashboard/settings/station/cash-drawer";
      const response = await fetchWithStore(url, {
        method: editingCashDrawer ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationCode: selectedStationCode,
          ...cashDrawerForm,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save cash drawer");
      }

      toast.success(
        editingCashDrawer ? "Cash drawer updated" : "Cash drawer added",
      );
      setEditingCashDrawer(null);
      setCashDrawerView("list");
      await refreshCashDrawers();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save cash drawer",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCashDrawer = async () => {
    if (!cashDrawerToDelete) return;

    try {
      setSaving(true);
      const response = await fetchWithStore(
        `/api/dashboard/settings/station/cash-drawer/${cashDrawerToDelete.cashDrawerId}`,
        { method: "DELETE" },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to delete cash drawer");
      }
      toast.success("Cash drawer deleted");
      setCashDrawerToDelete(null);
      if (form.cashDrawerCode === cashDrawerToDelete.cashDrawerCode) {
        updateForm("cashDrawerCode", "");
      }
      await refreshCashDrawers();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete cash drawer",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!selectedStationCode) {
      toast.error("Select a station first");
      return;
    }

    try {
      setSaving(true);

      if (activeTab === "printer") {
        const response = await fetchWithStore(
          "/api/dashboard/settings/station/printer",
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              stationCode: selectedStationCode,
              assignments: printerRows.map((row) => ({
                profileCode: row.profileCode,
                localPrinterCode: row.localPrinterCode,
                backupPrinterCode: row.backupPrinterCode,
              })),
            }),
          },
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || "Failed to save printer settings");
        }
        toast.success(
          `Printer settings saved for ${selectedStation?.stationname || selectedStationCode}`,
        );
        const refresh = await fetchWithStore(
          `/api/dashboard/settings/station/printer?stationCode=${encodeURIComponent(selectedStationCode)}`,
          { cache: "no-store" },
        );
        const refreshPayload = await refresh.json().catch(() => null);
        if (refresh.ok) {
          setPrinters(
            Array.isArray(refreshPayload?.printers) ? refreshPayload.printers : [],
          );
          setPrinterRows(
            Array.isArray(refreshPayload?.rows) ? refreshPayload.rows : [],
          );
        }
        return;
      }
      const response = await fetchWithStore("/api/dashboard/settings/station", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationCode: selectedStationCode,
          ...getTabPayload(),
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save station settings");
      }

      if (payload?.setting) {
        setForm({
          ...DEFAULT_STATION_SETTINGS,
          ...payload.setting,
          theme:
            String(payload.setting?.theme ?? "").toLowerCase() === "light"
              ? "Light"
              : "Dark",
          fontSize: Number(payload.setting?.fontSize ?? 13) || 13,
          idealTimeLogout: String(payload.setting?.idealTimeLogout ?? "0"),
        });
      }

      toast.success(
        `${activeTabLabel} saved for ${selectedStation?.stationname || selectedStationCode}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save station settings",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Station Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Select a station, then configure and save its settings
          </p>
        </div>

        <div className="card">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Station
          </label>
          <select
            value={selectedStationCode}
            onChange={(event) => setSelectedStationCode(event.target.value)}
            disabled={stationsLoading || stations.length === 0}
            className={selectClassName}
          >
            <option value="">
              {stationsLoading
                ? "Loading stations..."
                : stations.length === 0
                  ? "No stations found"
                  : "Select a station"}
            </option>
            {stations.map((station) => (
              <option key={station.stationCode} value={station.stationCode}>
                {station.stationname || station.stationCode}
              </option>
            ))}
          </select>
        </div>

        {!selectedStationCode ? (
          <div className="card">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose a station to view and save its settings.
            </p>
          </div>
        ) : (
          <>
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex flex-wrap gap-x-6 gap-y-2">
                {STATION_TABS.map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
                        active
                          ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
                          : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="card space-y-6">
              {settingsLoading ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Loading settings for{" "}
                  {selectedStation?.stationname || selectedStationCode}...
                </p>
              ) : (
                <>
                  {activeTab === "general" && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Session Timeout
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Auto logout session time in minutes (max 400).
                          </p>
                          <input
                            type="number"
                            min={0}
                            max={400}
                            value={form.idealTimeLogout}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              if (nextValue === "") {
                                updateForm("idealTimeLogout", "0");
                                return;
                              }
                              const parsed = Number.parseInt(nextValue, 10);
                              if (Number.isNaN(parsed)) return;
                              updateForm(
                                "idealTimeLogout",
                                String(Math.min(400, Math.max(0, parsed))),
                              );
                            }}
                            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Font Size
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Default 13.
                          </p>
                          <select
                            value={form.fontSize}
                            onChange={(event) =>
                              updateForm(
                                "fontSize",
                                Number.parseInt(event.target.value, 10),
                              )
                            }
                            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          >
                            {FONT_SIZES.map((size) => (
                              <option key={size} value={size}>
                                {size}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Theme Mode
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Switch between light and dark mode.
                          </p>
                          <div
                            className="inline-flex items-center rounded-md border border-gray-300 bg-white p-1 dark:border-gray-600 dark:bg-gray-800"
                            role="group"
                            aria-label="Theme mode"
                          >
                            <button
                              type="button"
                              title="Light mode"
                              aria-pressed={form.theme === "Light"}
                              onClick={() => updateForm("theme", "Light")}
                              className={`inline-flex items-center justify-center rounded-md p-2 transition-colors ${
                                form.theme === "Light"
                                  ? "bg-blue-600 text-white"
                                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                              }`}
                            >
                              <SunIcon className="h-5 w-5" />
                              <span className="sr-only">Light mode</span>
                            </button>
                            <button
                              type="button"
                              title="Dark mode"
                              aria-pressed={form.theme === "Dark"}
                              onClick={() => updateForm("theme", "Dark")}
                              className={`inline-flex items-center justify-center rounded-md p-2 transition-colors ${
                                form.theme === "Dark"
                                  ? "bg-blue-600 text-white"
                                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                              }`}
                            >
                              <MoonIcon className="h-5 w-5" />
                              <span className="sr-only">Dark mode</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <StatusToggle
                          label="Table Selection Required"
                          value={form.tabSelectionReqDin}
                          onChange={(value) =>
                            updateForm("tabSelectionReqDin", value)
                          }
                        />
                        <StatusToggle
                          label="Barcode Scanner"
                          value={form.isBarcodeScanner}
                          onChange={(value) =>
                            updateForm("isBarcodeScanner", value)
                          }
                        />
                        <StatusToggle
                          label="On-Screen Keyboard"
                          value={form.enableMobileKeyboard}
                          onChange={(value) =>
                            updateForm("enableMobileKeyboard", value)
                          }
                        />
                        <StatusToggle
                          label="Tip Adjustment Receipt"
                          value={form.isTipAdjustmentReceipt}
                          onChange={(value) =>
                            updateForm("isTipAdjustmentReceipt", value)
                          }
                        />
                      </div>

                      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Order Status
                        </h3>
                        <div className="mt-4 space-y-3">
                          <StatusToggle
                            label="Auto Assign PICKED After Payment"
                            value={form.isAutoPicked}
                            onChange={(value) =>
                              updateForm("isAutoPicked", value)
                            }
                          />
                          <StatusToggle
                            label="Auto Assign DELIVERED After Payment"
                            value={form.isAutoDelivered}
                            onChange={(value) =>
                              updateForm("isAutoDelivered", value)
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Default Order Type
                        </h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          Select the default order type when opening a new
                          check.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-3">
                          {ORDER_TYPES.map((orderType) => {
                            const selected =
                              form.openCheckSelection === orderType;
                            return (
                              <button
                                key={orderType}
                                type="button"
                                onClick={() =>
                                  updateForm("openCheckSelection", orderType)
                                }
                                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                                  selected
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                }`}
                              >
                                {orderType}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === "liquor" && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Liquor Dispenser Configuration
                      </h3>
                      <div className="flex items-center gap-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          BURG Device Enable
                        </p>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={form.isBurg}
                          onClick={() => updateForm("isBurg", !form.isBurg)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 ${
                            form.isBurg
                              ? "bg-blue-600 dark:bg-blue-500"
                              : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                              form.isBurg ? "translate-x-5" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  )}
                  {activeTab === "printer" && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Printer Setting
                        </h3>
                        <Link
                          href="/dashboard/printer"
                          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          Open Printer Master
                        </Link>
                      </div>

                      {printerLoading ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Loading printer profiles...
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                  Profile Name
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                  Local Printer
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                  Backup Printer
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                  Print
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {printerRows.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={4}
                                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                                  >
                                    No printer profiles found. Create a profile
                                    first.
                                  </td>
                                </tr>
                              ) : (
                                printerRows.map((row) => (
                                  <tr key={row.profileCode}>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                      {row.profileName}
                                    </td>
                                    <td className="px-4 py-3">
                                      <select
                                        value={row.localPrinterCode}
                                        onChange={(event) =>
                                          updatePrinterRow(
                                            row.profileCode,
                                            "localPrinterCode",
                                            event.target.value,
                                          )
                                        }
                                        className={tableSelectClassName}
                                      >
                                        <option value="">-- None --</option>
                                        {printers.map((printer) => (
                                          <option
                                            key={printer.printerCode}
                                            value={printer.printerCode}
                                          >
                                            {printer.printerName}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="px-4 py-3">
                                      <select
                                        value={row.backupPrinterCode}
                                        onChange={(event) =>
                                          updatePrinterRow(
                                            row.profileCode,
                                            "backupPrinterCode",
                                            event.target.value,
                                          )
                                        }
                                        className={tableSelectClassName}
                                      >
                                        <option value="">-- None --</option>
                                        {printers.map((printer) => (
                                          <option
                                            key={printer.printerCode}
                                            value={printer.printerCode}
                                          >
                                            {printer.printerName}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex flex-wrap gap-2">
                                        <span
                                          className={`rounded-md border px-3 py-1 text-xs font-medium ${
                                            row.printerType === "Receipt"
                                              ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-300"
                                              : "border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400"
                                          }`}
                                        >
                                          Receipt
                                        </span>
                                        <span
                                          className={`rounded-md border px-3 py-1 text-xs font-medium ${
                                            row.printerType === "Prep-Zone"
                                              ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-300"
                                              : "border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400"
                                          }`}
                                        >
                                          Prepzone
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === "tender" && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Tender Settings
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Configured tender types for this station.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => openTenderModal()}
                          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          Add Tender
                        </button>
                        <button
                          type="button"
                          onClick={() => openPaymentDeviceModal()}
                          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          Open Payment Device
                        </button>
                        <button
                          type="button"
                          onClick={() => openExternalPayModal()}
                          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          Open External Payment
                        </button>
                      </div>

                      {tenderLoading ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Loading tenders...
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                  Tender Name
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                  Type
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                  Active
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {tenders.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={4}
                                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                                  >
                                    No tenders configured for this station
                                  </td>
                                </tr>
                              ) : (
                                tenders.map((tender) => (
                                  <tr key={tender.tenderTypeId}>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                                      {tender.tenderName || "-"}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                      {tender.tenderType || "-"}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                      {tender.isActive ? "True" : "False"}
                                    </td>
                                    <td className="px-4 py-3">
                                      <button
                                        type="button"
                                        onClick={() => openTenderModal(tender)}
                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                      >
                                        <PencilIcon className="h-4 w-4" />
                                        Edit
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === "cash-drawer" && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Cash Drawer Configuration
                        </h3>
                        <button
                          type="button"
                          onClick={() => openCashDrawerModal()}
                          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          Open Cash Drawer Master
                        </button>
                      </div>

                      <div className="flex items-center gap-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Cash Drawer Enable
                        </p>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={form.isCashDrawer}
                          onClick={() =>
                            updateForm("isCashDrawer", !form.isCashDrawer)
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 ${
                            form.isCashDrawer
                              ? "bg-blue-600 dark:bg-blue-500"
                              : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                              form.isCashDrawer
                                ? "translate-x-5"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {form.isCashDrawer && (
                        <>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Select Cash Drawer
                            </label>
                            <select
                              value={form.cashDrawerCode}
                              onChange={(event) => {
                                const code = event.target.value;
                                const selected = cashDrawers.find(
                                  (drawer) => drawer.cashDrawerCode === code,
                                );
                                updateForm("cashDrawerCode", code);
                                updateForm(
                                  "cashDrawerComport",
                                  selected?.comPort || "",
                                );
                              }}
                              className={selectClassName}
                            >
                              <option value="">Select cash drawer</option>
                              {cashDrawers
                                .filter((drawer) => drawer.isActive !== false)
                                .map((drawer) => (
                                  <option
                                    key={drawer.cashDrawerId}
                                    value={drawer.cashDrawerCode}
                                  >
                                    {drawer.cashDrawerName ||
                                      drawer.cashDrawerCode}
                                  </option>
                                ))}
                            </select>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            COM Port:{" "}
                            {cashDrawers.find(
                              (drawer) =>
                                drawer.cashDrawerCode === form.cashDrawerCode,
                            )?.comPort || "-"}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}

              {activeTab !== "tender" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || settingsLoading || printerLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : activeTab === "printer"
                        ? "Save Printer Settings"
                        : activeTab === "cash-drawer"
                          ? "Save Settings"
                          : `Save ${activeTabLabel}`}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <CRUDModal
        isOpen={tenderModalOpen}
        onClose={() => {
          setTenderModalOpen(false);
          setEditingTender(null);
        }}
        title={editingTender ? "Edit Tender" : "Add Tender"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 items-end gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tender Name *
              </label>
              <input
                type="text"
                value={tenderForm.tenderName}
                onChange={(event) =>
                  setTenderForm((prev) => ({
                    ...prev,
                    tenderName: event.target.value,
                  }))
                }
                className={modalInputClassName}
                placeholder="Enter Tender Name"
              />
            </div>
            <StatusToggle
              label="Active"
              value={tenderForm.isActive}
              onChange={(value) =>
                setTenderForm((prev) => ({ ...prev, isActive: value }))
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tender Type
            </label>
            <select
              value={tenderForm.tenderType}
              onChange={(event) => {
                const nextType = event.target.value;
                setTenderForm((prev) => ({
                  ...prev,
                  tenderType: nextType,
                  deviceSelectionCode:
                    nextType === "Card" ? prev.deviceSelectionCode : "",
                  externalPayCode:
                    nextType === "External Pay" ? prev.externalPayCode : "",
                }));
              }}
              className={modalInputClassName}
            >
              {TENDER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {tenderForm.tenderType === "Card" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Payment Device *
              </label>
              <select
                value={tenderForm.deviceSelectionCode}
                onChange={(event) =>
                  setTenderForm((prev) => ({
                    ...prev,
                    deviceSelectionCode: event.target.value,
                  }))
                }
                className={modalInputClassName}
              >
                <option value="">Select payment device</option>
                {tenderPaymentDevices.map((device) => (
                  <option
                    key={device.payDeviceCode}
                    value={device.payDeviceCode}
                  >
                    {device.payDeviceName || device.payDeviceCode}
                    {device.payDeviceType ? ` (${device.payDeviceType})` : ""}
                  </option>
                ))}
              </select>
              {tenderPaymentDevices.length === 0 && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  No payment devices found for this station. Add one from Open
                  Payment Device.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Cash Drawer Selection
            </label>
            <select
              value={tenderForm.cashDrawerCode}
              onChange={(event) =>
                setTenderForm((prev) => ({
                  ...prev,
                  cashDrawerCode: event.target.value,
                }))
              }
              className={modalInputClassName}
            >
              <option value="">Select cash drawer</option>
              {tenderCashDrawers.map((drawer) => (
                <option
                  key={`${drawer.stationCode}-${drawer.cashDrawerCode}`}
                  value={drawer.cashDrawerCode}
                >
                  {drawer.cashDrawerName || drawer.cashDrawerCode}
                </option>
              ))}
            </select>
          </div>

          {tenderForm.tenderType === "External Pay" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                External Payment
              </label>
              <select
                value={tenderForm.externalPayCode}
                onChange={(event) =>
                  setTenderForm((prev) => ({
                    ...prev,
                    externalPayCode: event.target.value,
                  }))
                }
                className={modalInputClassName}
              >
                <option value="">Select external payment</option>
                {tenderExternalPays.map((pay) => (
                  <option
                    key={pay.externalPayId}
                    value={pay.externalPayCode || pay.externalPayId}
                  >
                    {pay.externalPayName || pay.externalPayCode}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Display Order
            </label>
            <input
              type="number"
              min={0}
              value={tenderForm.displayOrder}
              onChange={(event) =>
                setTenderForm((prev) => ({
                  ...prev,
                  displayOrder: event.target.value,
                }))
              }
              className={modalInputClassName}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Fee Details
            </label>
            <select
              value={tenderForm.feeCode}
              onChange={(event) =>
                setTenderForm((prev) => ({
                  ...prev,
                  feeCode: event.target.value,
                }))
              }
              className={modalInputClassName}
            >
              <option value="">None</option>
              {tenderFees.map((fee) => (
                <option key={fee.feeCode} value={fee.feeCode}>
                  {fee.feeName || fee.feeCode}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Pre-Auth Amount
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={tenderForm.preAuthAmount}
              onChange={(event) =>
                setTenderForm((prev) => ({
                  ...prev,
                  preAuthAmount: event.target.value,
                }))
              }
              className={modalInputClassName}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StatusToggle
              label="Allow Tip"
              value={tenderForm.allowTip}
              onChange={(value) =>
                setTenderForm((prev) => ({ ...prev, allowTip: value }))
              }
            />
            <StatusToggle
              label="Allow Pre Auth"
              value={tenderForm.preAuthAllow}
              onChange={(value) =>
                setTenderForm((prev) => ({ ...prev, preAuthAllow: value }))
              }
            />
            <StatusToggle
              label="Allow Signature"
              value={tenderForm.signatureAllow}
              onChange={(value) =>
                setTenderForm((prev) => ({ ...prev, signatureAllow: value }))
              }
            />
            <StatusToggle
              label="Allow Tax Exempt"
              value={tenderForm.taxExempt}
              onChange={(value) =>
                setTenderForm((prev) => ({ ...prev, taxExempt: value }))
              }
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveTender}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </CRUDModal>

      <CRUDModal
        isOpen={paymentDeviceModalOpen}
        onClose={() => {
          setPaymentDeviceModalOpen(false);
          setPaymentDeviceView("list");
          setEditingPaymentDevice(null);
        }}
        title={
          paymentDeviceView === "form"
            ? editingPaymentDevice
              ? "Edit Payment Device Config"
              : "Add Payment Device Config"
            : "Payment Device Config Master"
        }
        size="lg"
      >
        {paymentDeviceView === "list" ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => openPaymentDeviceForm()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Add Payment Device Config
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      Device Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      Device Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      Active
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paymentDevices.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        No payment devices configured for this station
                      </td>
                    </tr>
                  ) : (
                    paymentDevices.map((device) => (
                      <tr key={device.configId}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {device.payDeviceName || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {device.payDeviceType || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {device.isActive ? "True" : "False"}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openPaymentDeviceForm(device)}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <PencilIcon className="h-4 w-4" />
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <StatusToggle
                label="Is Live"
                value={paymentDeviceForm.isDeviceLive}
                onChange={(value) =>
                  setPaymentDeviceForm((prev) => ({
                    ...prev,
                    isDeviceLive: value,
                  }))
                }
              />
              <StatusToggle
                label="Active"
                value={paymentDeviceForm.isActive}
                onChange={(value) =>
                  setPaymentDeviceForm((prev) => ({
                    ...prev,
                    isActive: value,
                  }))
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Device Name *
              </label>
              <input
                type="text"
                value={paymentDeviceForm.payDeviceName}
                onChange={(event) =>
                  setPaymentDeviceForm((prev) => ({
                    ...prev,
                    payDeviceName: event.target.value,
                  }))
                }
                className={modalInputClassName}
                placeholder="Enter Device Name"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Device Type
              </label>
              <select
                value={paymentDeviceForm.payDeviceType}
                onChange={(event) =>
                  setPaymentDeviceForm((prev) => ({
                    ...prev,
                    payDeviceType: event.target.value,
                  }))
                }
                className={modalInputClassName}
              >
                {PAY_DEVICE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 rounded-lg border border-gray-200 p-4 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">
              <p>
                <span className="font-medium">API URL</span>
                {" : "}
                {paymentDeviceEnv.apiUrl || "-"}
              </p>
              <p>
                <span className="font-medium">Channel Id</span>
                {" : "}
                {maskPaymentSecret(paymentDeviceEnv.channelId)}
              </p>
              <p>
                <span className="font-medium">ISV Key</span>
                {" : "}
                {maskPaymentSecret(paymentDeviceEnv.isvKey)}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                App ID
              </label>
              <input
                type="text"
                value={paymentDeviceForm.appId}
                onChange={(event) =>
                  setPaymentDeviceForm((prev) => ({
                    ...prev,
                    appId: event.target.value,
                  }))
                }
                className={modalInputClassName}
                placeholder="Enter App ID"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                App Key
              </label>
              <input
                type="text"
                value={paymentDeviceForm.appKey}
                onChange={(event) =>
                  setPaymentDeviceForm((prev) => ({
                    ...prev,
                    appKey: event.target.value,
                  }))
                }
                className={modalInputClassName}
                placeholder="Enter App Key"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                EPI
              </label>
              <input
                type="text"
                value={paymentDeviceForm.epi}
                onChange={(event) =>
                  setPaymentDeviceForm((prev) => ({
                    ...prev,
                    epi: event.target.value,
                  }))
                }
                className={modalInputClassName}
                placeholder="Enter EPI"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  IP Address
                </label>
                <input
                  type="text"
                  value={paymentDeviceForm.ipAddress}
                  onChange={(event) =>
                    setPaymentDeviceForm((prev) => ({
                      ...prev,
                      ipAddress: event.target.value,
                    }))
                  }
                  className={modalInputClassName}
                  placeholder="Enter IP Address"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Port No
                </label>
                <input
                  type="number"
                  value={paymentDeviceForm.portNo}
                  onChange={(event) =>
                    setPaymentDeviceForm((prev) => ({
                      ...prev,
                      portNo: event.target.value,
                    }))
                  }
                  className={modalInputClassName}
                  placeholder="Enter Port No"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setPaymentDeviceView("list");
                  setEditingPaymentDevice(null);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Back
              </button>
              {editingPaymentDevice && (
                <button
                  type="button"
                  onClick={() => {
                    setPaymentDeviceToDelete(editingPaymentDevice);
                    setPaymentDeviceView("list");
                  }}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-900/20"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={handleSavePaymentDevice}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}
      </CRUDModal>

      <CRUDModal
        isOpen={cashDrawerModalOpen}
        onClose={() => {
          setCashDrawerModalOpen(false);
          setCashDrawerView("list");
          setEditingCashDrawer(null);
        }}
        title={
          cashDrawerView === "form"
            ? editingCashDrawer
              ? "Edit Cash Drawer"
              : "Add Cash Drawer"
            : "Cash Drawer Master"
        }
        size="lg"
      >
        {cashDrawerView === "list" ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => openCashDrawerForm()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Add Cash Drawer
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      Connection Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      COM Port
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      Active
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {cashDrawers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        No cash drawers configured for this station
                      </td>
                    </tr>
                  ) : (
                    cashDrawers.map((drawer) => (
                      <tr key={drawer.cashDrawerId}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {drawer.cashDrawerName || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {drawer.connectionType || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {drawer.comPort || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {drawer.isActive ? "True" : "False"}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openCashDrawerForm(drawer)}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <PencilIcon className="h-4 w-4" />
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Cash Drawer Name *
              </label>
              <input
                type="text"
                value={cashDrawerForm.cashDrawerName}
                onChange={(event) =>
                  setCashDrawerForm((prev) => ({
                    ...prev,
                    cashDrawerName: event.target.value,
                  }))
                }
                className={modalInputClassName}
                placeholder="Enter cash drawer name"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Connection Type
              </label>
              <select
                value={cashDrawerForm.connectionType}
                onChange={(event) =>
                  setCashDrawerForm((prev) => ({
                    ...prev,
                    connectionType: event.target.value,
                    printerCode:
                      event.target.value === "Printer" ? prev.printerCode : "",
                  }))
                }
                className={modalInputClassName}
              >
                {CASH_DRAWER_CONNECTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {cashDrawerForm.connectionType === "Printer" && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Printer
                </label>
                <select
                  value={cashDrawerForm.printerCode}
                  onChange={(event) =>
                    setCashDrawerForm((prev) => ({
                      ...prev,
                      printerCode: event.target.value,
                    }))
                  }
                  className={modalInputClassName}
                >
                  <option value="">Select printer</option>
                  {cashDrawerPrinters.map((printer) => (
                    <option
                      key={printer.printerCode}
                      value={printer.printerCode}
                    >
                      {printer.printerName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                COM Port
              </label>
              <input
                type="text"
                value={cashDrawerForm.comPort}
                onChange={(event) =>
                  setCashDrawerForm((prev) => ({
                    ...prev,
                    comPort: event.target.value,
                  }))
                }
                className={modalInputClassName}
                placeholder="Enter COM port"
              />
            </div>

            <StatusToggle
              label="Active"
              value={cashDrawerForm.isActive}
              onChange={(value) =>
                setCashDrawerForm((prev) => ({ ...prev, isActive: value }))
              }
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setCashDrawerView("list");
                  setEditingCashDrawer(null);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Back
              </button>
              {editingCashDrawer && (
                <button
                  type="button"
                  onClick={() => {
                    setCashDrawerToDelete(editingCashDrawer);
                    setCashDrawerView("list");
                  }}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-900/20"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveCashDrawerMaster}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}
      </CRUDModal>

      <CRUDModal
        isOpen={externalPayModalOpen}
        onClose={() => {
          setExternalPayModalOpen(false);
          setExternalPayView("list");
          setEditingExternalPay(null);
        }}
        title={
          externalPayView === "form"
            ? editingExternalPay
              ? "Edit External Payment"
              : "Add External Payment"
            : "External Payment"
        }
        size="lg"
      >
        {externalPayView === "list" ? (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => openExternalPayForm()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Add External Payment
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      Active
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-300">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {tenderExternalPays.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        No external payments configured for this station
                      </td>
                    </tr>
                  ) : (
                    tenderExternalPays.map((pay) => (
                      <tr key={pay.externalPayId}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {pay.externalPayName || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {pay.isActive ? "True" : "False"}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openExternalPayForm(pay)}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <PencilIcon className="h-4 w-4" />
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tender Name *
              </label>
              <input
                type="text"
                value={externalPayForm.externalPayName}
                onChange={(event) =>
                  setExternalPayForm((prev) => ({
                    ...prev,
                    externalPayName: event.target.value,
                  }))
                }
                className={modalInputClassName}
                placeholder="Enter tender name"
              />
            </div>
            <StatusToggle
              label="Active"
              value={externalPayForm.isActive}
              onChange={(value) =>
                setExternalPayForm((prev) => ({ ...prev, isActive: value }))
              }
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setExternalPayView("list");
                  setEditingExternalPay(null);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Back
              </button>
              {editingExternalPay && (
                <button
                  type="button"
                  onClick={() => {
                    setTenderToDelete(editingExternalPay);
                    setExternalPayView("list");
                  }}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-900/20"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveExternalPay}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : editingExternalPay ? "Update" : "Save"}
              </button>
            </div>
          </div>
        )}
      </CRUDModal>

      <DeleteConfirmationModal
        isOpen={!!tenderToDelete}
        onClose={() => setTenderToDelete(null)}
        onConfirm={handleDeleteTender}
        title="Delete External Payment"
        itemName={tenderToDelete?.externalPayName || "this external payment"}
        isLoading={saving}
      />
      <DeleteConfirmationModal
        isOpen={!!paymentDeviceToDelete}
        onClose={() => setPaymentDeviceToDelete(null)}
        onConfirm={handleDeletePaymentDevice}
        title="Delete Payment Device"
        itemName={paymentDeviceToDelete?.payDeviceName || "this payment device"}
        isLoading={saving}
      />
      <DeleteConfirmationModal
        isOpen={!!cashDrawerToDelete}
        onClose={() => setCashDrawerToDelete(null)}
        onConfirm={handleDeleteCashDrawer}
        title="Delete Cash Drawer"
        itemName={cashDrawerToDelete?.cashDrawerName || "this cash drawer"}
        isLoading={saving}
      />
    </DashboardLayout>
  );
}
