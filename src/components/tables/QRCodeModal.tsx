"use client";

import { Fragment, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: any;
}

export default function QRCodeModal({
  isOpen,
  onClose,
  table,
}: QRCodeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (table && isOpen) {
      generateQRCode();
    }
  }, [table, isOpen]);

  const generateQRCode = async () => {
    if (!table) return;

    // Use tableNumber for QR code URL (or tableId if tableNumber is not available)
    const tableIdentifier = table.tableNumber || table.tableId || table.id;

    if (!tableIdentifier) {
      console.error("Table identifier not found");
      return;
    }

    const qrUrl = `${window.location.origin}/qr-order/${encodeURIComponent(
      tableIdentifier
    )}`;

    try {
      const dataUrl = await QRCode.toDataURL(qrUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;

    const link = document.createElement("a");
    link.download = `table-${table.tableNumber}-qr.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handlePrint = () => {
    if (!qrDataUrl) return;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Table ${table?.tableNumber} QR Code</title>
            <style>
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                font-family: Arial, sans-serif;
              }
              h1 { margin-bottom: 20px; }
              img { max-width: 300px; }
            </style>
          </head>
          <body>
            <h1>Table ${table?.tableNumber}</h1>
            <img src="${qrDataUrl}" alt="QR Code" />
            <p>Scan to order</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (!table) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25 dark:bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white">
                    Table {table.tableNumber || table.id || table.tableId} QR
                    Code
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex flex-col items-center space-y-4">
                  {qrDataUrl ? (
                    <div className="p-4 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg">
                      <img
                        src={qrDataUrl}
                        alt="QR Code"
                        className="w-64 h-64"
                      />
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-center w-64 h-64">
                      <p className="text-gray-500 dark:text-gray-400">
                        Generating QR code...
                      </p>
                    </div>
                  )}

                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    Customers can scan this QR code to view menu and place
                    orders
                  </p>

                  <div className="flex space-x-3 w-full pt-4">
                    <button
                      onClick={handleDownload}
                      disabled={!qrDataUrl}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Download
                    </button>
                    <button
                      onClick={handlePrint}
                      disabled={!qrDataUrl}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Print
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
