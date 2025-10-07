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

    const qrUrl = `${window.location.origin}/qr-order/${table.qrCode}`;

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
          <div className="fixed inset-0 bg-black bg-opacity-25" />
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-xl font-bold text-gray-900">
                    Table {table.tableNumber} QR Code
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex flex-col items-center space-y-4">
                  {qrDataUrl && (
                    <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                      <img
                        src={qrDataUrl}
                        alt="QR Code"
                        className="w-64 h-64"
                      />
                    </div>
                  )}

                  <p className="text-sm text-gray-600 text-center">
                    Customers can scan this QR code to view menu and place
                    orders
                  </p>

                  <div className="flex space-x-3 w-full pt-4">
                    <button
                      onClick={handleDownload}
                      className="btn btn-secondary flex-1"
                    >
                      Download
                    </button>
                    <button
                      onClick={handlePrint}
                      className="btn btn-primary flex-1"
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
