"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import CRUDModal from "./CRUDModal";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemName: string;
  description?: string;
  isLoading?: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  description,
  isLoading = false,
}: DeleteConfirmationModalProps) {
  const defaultDescription = `Are you sure you want to delete "${itemName}"? This action cannot be undone.`;

  return (
    <CRUDModal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Delete"
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-center">
          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
            <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {title}
          </h3>
          <div className="mt-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {description || defaultDescription}
            </p>
          </div>
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
          >
            {isLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </CRUDModal>
  );
}
