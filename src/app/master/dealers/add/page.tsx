"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MasterDashboardLayout from "@/components/layouts/MasterDashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { formatPhone, formatZipcode } from "@/lib/utils";

interface Company {
  companyId: string;
  companyCode: string;
  companyName: string;
}

export default function AddDealerPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companySelection, setCompanySelection] = useState<"existing" | "new">(
    "existing"
  );
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    dealerCode: "",
    dealerName: "",
    companyId: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "USA",
    zipcode: "",
    phone: "",
    email: "",
    // Company creation fields
    companyName: "",
    companyAddressLine1: "",
    companyAddressLine2: "",
    companyCity: "",
    companyState: "",
    companyCountry: "USA",
    companyZipcode: "",
    companyPhone: "",
    companyEmail: "",
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem("master_admin_token");
      const response = await fetch("/api/master/companies", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
      toast.error("Error fetching companies");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("master_admin_token");

      // If creating new company, create it first
      let finalCompanyId = formData.companyId;
      if (companySelection === "new" && formData.companyName) {
        const companyResponse = await fetch("/api/master/companies", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            companyName: formData.companyName,
            addressLine1: formData.companyAddressLine1,
            addressLine2: formData.companyAddressLine2,
            city: formData.companyCity,
            state: formData.companyState,
            country: formData.companyCountry,
            zipcode: formData.companyZipcode,
            phone: formData.companyPhone,
            email: formData.companyEmail,
          }),
        });

        if (!companyResponse.ok) {
          try {
            const errorData = await companyResponse.json();
            const errorMessage = errorData.error || "Failed to create company";
            toast.error(errorMessage);
          } catch (jsonError) {
            toast.error("Failed to create company");
          }
          setLoading(false);
          return;
        }

        const newCompany = await companyResponse.json();
        finalCompanyId = newCompany.companyId;
        toast.success("Company created successfully");
      }

      // Prepare dealer data
      const dealerData: any = {
        dealerCode: formData.dealerCode || "", // Will be auto-generated if empty
        dealerName: formData.dealerName,
        addressLine1: formData.addressLine1 || null,
        addressLine2: formData.addressLine2 || null,
        city: formData.city || null,
        state: formData.state || null,
        country: formData.country || null,
        zipcode: formData.zipcode || null,
        phone: formData.phone || null,
        email: formData.email || null,
      };

      // Only include companyId if it's provided (optional)
      if (finalCompanyId && finalCompanyId.trim() !== "") {
        dealerData.companyId = finalCompanyId;
      }
      // If companyId is empty, don't include it (will be null in database)

      const response = await fetch("/api/master/dealers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dealerData),
      });

      if (response.ok) {
        toast.success("Dealer created successfully");
        router.push("/master/dealers");
      } else {
        try {
          const errorData = await response.json();
          const errorMessage = errorData.error || "Failed to create dealer";
          toast.error(errorMessage);
        } catch (jsonError) {
          toast.error("Failed to create dealer");
        }
      }
    } catch (error) {
      // Only log unexpected errors (network errors, etc.)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error("Network error. Please check your connection.");
      } else {
        toast.error("Error saving dealer");
      }
    } finally {
      setLoading(false);
    }
  };

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
              Add Dealer
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Create a new dealer
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dealer Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                Dealer Information
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dealer Code{" "}
                  <span className="text-gray-500 text-xs">
                    (Optional - Auto-generated if empty)
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.dealerCode}
                  onChange={(e) =>
                    setFormData({ ...formData, dealerCode: e.target.value })
                  }
                  placeholder="Leave empty to auto-generate"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dealer Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.dealerName}
                  onChange={(e) =>
                    setFormData({ ...formData, dealerName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Company Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                Company
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Company Selection
                </label>
                <div className="flex flex-wrap gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setCompanySelection("existing")}
                    className={`relative px-6 py-3 rounded-lg border-2 transition-all font-medium ${
                      companySelection === "existing"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                    }`}
                  >
                    Select Existing
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompanySelection("new")}
                    className={`relative px-6 py-3 rounded-lg border-2 transition-all font-medium ${
                      companySelection === "new"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                    }`}
                  >
                    Create New
                  </button>
                </div>
              </div>

              {companySelection === "existing" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select Company (Optional)
                  </label>
                  <select
                    value={formData.companyId}
                    onChange={(e) =>
                      setFormData({ ...formData, companyId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">No Company (Optional)</option>
                    {companies.map((company) => (
                      <option key={company.companyId} value={company.companyId}>
                        {company.companyName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    New Company Details
                  </h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      required={companySelection === "new"}
                      value={formData.companyName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          companyName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Address Line 1
                    </label>
                    <input
                      type="text"
                      value={formData.companyAddressLine1}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          companyAddressLine1: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={formData.companyAddressLine2}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          companyAddressLine2: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={formData.companyCity}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            companyCity: e.target.value,
                          })
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
                        value={formData.companyState}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            companyState: e.target.value,
                          })
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
                        value={formData.companyCountry}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            companyCountry: e.target.value,
                          })
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
                        value={formData.companyZipcode}
                        onChange={(e) => {
                          const formatted = formatZipcode(e.target.value);
                          setFormData({
                            ...formData,
                            companyZipcode: formatted,
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="12345 or 12345-6789"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.companyPhone}
                        onChange={(e) => {
                          const formatted = formatPhone(e.target.value);
                          setFormData({
                            ...formData,
                            companyPhone: formatted,
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="(123) 456-7890"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.companyEmail}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            companyEmail: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dealer Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b pb-2">
                Dealer Address
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="12345 or 12345-6789"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="(123) 456-7890"
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
                {loading ? "Creating..." : "Create Dealer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </MasterDashboardLayout>
  );
}
