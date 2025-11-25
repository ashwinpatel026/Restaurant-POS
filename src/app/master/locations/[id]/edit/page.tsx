"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import MasterDashboardLayout from "@/components/layouts/MasterDashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { FormSkeleton } from "@/components/ui/SkeletonLoader";
import {
  formatFederalTaxId,
  formatSSN,
  formatPhone,
  formatZipcode,
} from "@/lib/utils";
import StatusToggle from "@/components/forms/StatusToggle";

interface Company {
  companyId: string;
  companyCode: string;
  companyName: string;
}

interface Dealer {
  dealerId: string;
  dealerCode: string;
  dealerName: string;
  companyId: string;
}

interface Location {
  locationId: string;
  storeCode: string;
  locationName: string;
  companyId: string;
  dealerId?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
  phone?: string;
  email?: string;
  isActive: number;
  syncEnabled: number;
}

export default function EditLocationPage() {
  const router = useRouter();
  const params = useParams();
  const locationId = params.id as string;
  const [companies, setCompanies] = useState<Company[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [formData, setFormData] = useState({
    storeCode: "",
    locationName: "",
    companyId: "",
    dealerId: "",
    federalTaxId: "",
    socialSecurityNumber: "",
    entityType: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "USA",
    zipcode: "",
    phone: "",
    email: "",
    isActive: 1,
    syncEnabled: 1,
  });

  useEffect(() => {
    if (locationId) {
      fetchData();
    }
  }, [locationId]);

  // Fetch all dealers on component mount (independent of company)
  useEffect(() => {
    fetchAllDealers();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("master_admin_token");
      const [locationRes, companiesRes] = await Promise.all([
        fetch(`/api/master/locations/${locationId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }),
        fetch("/api/master/companies", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }),
      ]);

      if (locationRes.ok) {
        const locationData = await locationRes.json();
        setLocation(locationData);
        setFormData({
          storeCode: locationData.storeCode || "",
          locationName: locationData.locationName || "",
          companyId: locationData.companyId || "",
          dealerId: locationData.dealerId || "",
          federalTaxId: locationData.federalTaxId || "",
          socialSecurityNumber: locationData.socialSecurityNumber || "",
          entityType: locationData.entityType?.type || "",
          addressLine1: locationData.addressLine1 || "",
          addressLine2: locationData.addressLine2 || "",
          city: locationData.city || "",
          state: locationData.state || "",
          country: locationData.country || "USA",
          zipcode: locationData.zipcode || "",
          phone: locationData.phone || "",
          email: locationData.email || "",
          isActive: locationData.isActive ?? 1,
          syncEnabled: locationData.syncEnabled ?? 1,
        });

        // Dealers are fetched independently on component mount
      } else {
        toast.error("Failed to load location");
        router.push("/master/locations");
      }

      if (companiesRes.ok) {
        const companiesData = await companiesRes.json();
        setCompanies(companiesData.filter((c: any) => c.isActive === 1));
      }
    } catch (error) {
      toast.error("Error loading data");
      console.error("Error:", error);
    } finally {
      setFetchLoading(false);
    }
  };

  const fetchAllDealers = async () => {
    try {
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch("/api/master/dealers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setDealers(data.filter((d: any) => d.isActive === 1));
      }
    } catch (error) {
      console.error("Error fetching dealers:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("master_admin_token");

      const locationData: any = {
        storeCode: formData.storeCode,
        locationName: formData.locationName,
        companyId:
          formData.companyId && formData.companyId.trim() !== ""
            ? formData.companyId
            : null,
        dealerId:
          formData.dealerId && formData.dealerId.trim() !== ""
            ? formData.dealerId
            : null,
        addressLine1: formData.addressLine1 || null,
        addressLine2: formData.addressLine2 || null,
        city: formData.city || null,
        state: formData.state || null,
        country: formData.country || null,
        zipcode: formData.zipcode || null,
        phone: formData.phone || null,
        email: formData.email || null,
        federalTaxId: formData.federalTaxId || null,
        socialSecurityNumber: formData.socialSecurityNumber || null,
        entityType: formData.entityType || null,
        isActive: formData.isActive,
        syncEnabled: formData.syncEnabled,
      };

      const response = await fetch(`/api/master/locations/${locationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(locationData),
      });

      if (response.ok) {
        toast.success("Location updated successfully");
        router.push("/master/locations");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update location");
      }
    } catch (error) {
      console.error("Error updating location:", error);
      toast.error("Error updating location");
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <MasterDashboardLayout>
        <FormSkeleton />
      </MasterDashboardLayout>
    );
  }

  return (
    <MasterDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Edit Location
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Update location information
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Location Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                Location Information
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location/ Business Name/ DBA *
                </label>
                <input
                  type="text"
                  required
                  value={formData.locationName}
                  onChange={(e) =>
                    setFormData({ ...formData, locationName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Company and Dealer Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                Company & Dealer
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Corporate Name / Legal Entity / Business Group (Optional)
                  </label>
                  <select
                    value={formData.companyId}
                    onChange={(e) =>
                      setFormData({ ...formData, companyId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select Company</option>
                    {companies.map((company) => (
                      <option key={company.companyId} value={company.companyId}>
                        {company.companyName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Dealer (Optional)
                  </label>
                  <select
                    value={formData.dealerId}
                    onChange={(e) =>
                      setFormData({ ...formData, dealerId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">No Dealer</option>
                    {dealers.map((dealer) => (
                      <option key={dealer.dealerId} value={dealer.dealerId}>
                        {dealer.dealerName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Federal Tax Id # (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.federalTaxId}
                    onChange={(e) => {
                      const formatted = formatFederalTaxId(e.target.value);
                      setFormData({ ...formData, federalTaxId: formatted });
                    }}
                    placeholder="XX-XXXXXXX"
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Social Security # (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.socialSecurityNumber}
                    onChange={(e) => {
                      const formatted = formatSSN(e.target.value);
                      setFormData({
                        ...formData,
                        socialSecurityNumber: formatted,
                      });
                    }}
                    placeholder="XXX-XX-XXXX"
                    maxLength={11}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Entity Type (Optional)
                </label>
                <select
                  value={formData.entityType}
                  onChange={(e) =>
                    setFormData({ ...formData, entityType: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Entity Type</option>
                  <option value="Sole Proprietor">Sole Proprietor</option>
                  <option value="Partnership">Partnership</option>
                  <option value="LLC">LLC</option>
                  <option value="Corporation (C-Corp)">
                    Corporation (C-Corp)
                  </option>
                  <option value="Corporation (S-Corp)">
                    Corporation (S-Corp)
                  </option>
                  <option value="Non-profit">Non-profit</option>
                </select>
              </div>
            </div>

            {/* Location Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                Location / Business Name / DBA Address
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address Line 1
                </label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) =>
                    setFormData({ ...formData, addressLine1: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Street address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={formData.addressLine2}
                  onChange={(e) =>
                    setFormData({ ...formData, addressLine2: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Apartment, suite, etc. (optional)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={formData.zipcode}
                    onChange={(e) => {
                      const formatted = formatZipcode(e.target.value);
                      setFormData({ ...formData, zipcode: formatted });
                    }}
                    placeholder="XXXXX or XXXXX-XXXX"
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                Contact Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      setFormData({ ...formData, phone: formatted });
                    }}
                    placeholder="(XXX) XXX-XXXX"
                    maxLength={14}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                Status
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <StatusToggle
                  label="Location Status"
                  description="Toggle to control whether this location is active and can be used in the system."
                  value={formData.isActive === 1}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      isActive: val ? 1 : 0,
                    })
                  }
                  disabled={loading}
                />
                <StatusToggle
                  label="Sync Enabled"
                  description="Toggle to enable or disable synchronization for this location."
                  value={formData.syncEnabled === 1}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      syncEnabled: val ? 1 : 0,
                    })
                  }
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update Location"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </MasterDashboardLayout>
  );
}
