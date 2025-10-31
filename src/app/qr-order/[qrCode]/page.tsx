"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  PlusIcon,
  MinusIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

interface MenuMaster {
  tblMenuMasterId: number;
  name: string;
  menuCategories: MenuCategory[];
}

interface MenuCategory {
  tblMenuCategoryId: number;
  name: string;
  menuItems: MenuItem[];
}

interface MenuItem {
  tblMenuItemId: number;
  name: string;
  labelName: string;
  price: number;
  isActive: number;
  modifiers: Modifier[];
}

interface Modifier {
  tblModifierId: number;
  name: string;
  required: number;
  isMultiselect: number;
  modifierItems: ModifierItem[];
}

interface ModifierItem {
  tblModifierItemId: number;
  name: string;
  price: number;
}

interface CartItem {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  selectedModifiers: { [modifierId: number]: number[] };
}

export default function QROrderPage() {
  const params = useParams();
  const qrCode = params?.qrCode as string;

  const [menuMasters, setMenuMasters] = useState<MenuMaster[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    fetchMenuData();
  }, []);

  const fetchMenuData = async () => {
    try {
      // Fetch menu data as public (no auth required for QR orders)
      const response = await fetch("/api/menu/masters?public=true");
      if (response.ok) {
        const data = await response.json();
        setMenuMasters(data || []);
      } else {
        toast.error("Failed to load menu");
      }
    } catch (error) {
      toast.error("Error loading menu");
      console.error("Error fetching menu:", error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: MenuItem) => {
    const existingItem = cart.find(
      (cartItem) => cartItem.menuItemId === item.tblMenuItemId
    );

    if (existingItem) {
      setCart(
        cart.map((cartItem) =>
          cartItem.menuItemId === item.tblMenuItemId
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      );
    } else {
      setCart([
        ...cart,
        {
          menuItemId: item.tblMenuItemId,
          name: item.name,
          price: item.price,
          quantity: 1,
          selectedModifiers: {},
        },
      ]);
    }
    toast.success("Added to cart");
  };

  const updateQuantity = (menuItemId: number, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter((item) => item.menuItemId !== menuItemId));
    } else {
      setCart(
        cart.map((item) =>
          item.menuItemId === menuItemId ? { ...item, quantity } : item
        )
      );
    }
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (!customerName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setOrdering(true);
    try {
      // Calculate totals
      const subtotal = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const tax = subtotal * 0.18; // 18% tax (adjust as needed)
      const total = subtotal + tax;

      const orderItems = cart.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        notes: null,
      }));

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tableNumber: qrCode, // Use QR code (table number) as identifier
          orderType: "QR_ORDER",
          customerName: customerName.trim(),
          orderItems,
          subtotal,
          tax,
          discount: 0,
          total,
        }),
      });

      if (response.ok) {
        const order = await response.json();
        toast.success(`Order placed successfully! Order #${order.orderNumber}`);
        setCart([]);
        setCustomerName("");
        setShowCart(false);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to place order");
      }
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error("Failed to place order");
    } finally {
      setOrdering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (menuMasters.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-yellow-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              No Menu Available
            </h1>
            <p className="text-gray-600 mb-6">
              No menu masters are currently configured. Please contact the
              restaurant.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Order from Table
              </h1>
              <p className="text-gray-600">QR Code: {qrCode}</p>
            </div>
            <button
              onClick={() => setShowCart(!showCart)}
              className="relative bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <ShoppingCartIcon className="w-5 h-5" />
              <span>Cart ({cart.length})</span>
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {menuMasters.map((master) => (
          <div key={master.tblMenuMasterId} className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              {master.name}
            </h2>

            {master.menuCategories && master.menuCategories.length > 0 ? (
              master.menuCategories.map((category) => (
                <div key={category.tblMenuCategoryId} className="mb-8">
                  <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                    {category.name}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.menuItems && category.menuItems.length > 0 ? (
                      category.menuItems
                        .filter((item) => item.isActive === 1)
                        .map((item) => (
                          <div
                            key={item.tblMenuItemId}
                            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                          >
                            <h4 className="text-lg font-semibold text-gray-900 mb-2">
                              {item.name}
                            </h4>
                            <p className="text-gray-600 mb-3">
                              {item.labelName}
                            </p>
                            <p className="text-xl font-bold text-blue-600 mb-4">
                              {formatPrice(item.price)}
                            </p>

                            {item.modifiers.length > 0 && (
                              <div className="mb-4">
                                <p className="text-sm text-gray-500 mb-2">
                                  Customizations:
                                </p>
                                {item.modifiers.map((modifier) => (
                                  <div
                                    key={modifier.tblModifierId}
                                    className="text-sm text-gray-600"
                                  >
                                    {modifier.name}{" "}
                                    {modifier.required === 1 && (
                                      <span className="text-red-500">*</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            <button
                              onClick={() => addToCart(item)}
                              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                            >
                              <PlusIcon className="w-4 h-4" />
                              <span>Add to Cart</span>
                            </button>
                          </div>
                        ))
                    ) : (
                      <p className="text-gray-500 col-span-full text-center py-4">
                        No items available in this category.
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">
                No categories available for this menu.
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
            <div className="flex flex-col h-full">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Your Order</h2>
                  <button
                    onClick={() => setShowCart(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Your cart is empty
                  </p>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div
                        key={item.menuItemId}
                        className="border rounded-lg p-4"
                      >
                        <h4 className="font-medium text-gray-900">
                          {item.name}
                        </h4>
                        <p className="text-gray-600">
                          {formatPrice(item.price)}
                        </p>

                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.menuItemId,
                                  item.quantity - 1
                                )
                              }
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <MinusIcon className="w-4 h-4" />
                            </button>
                            <span className="px-3 py-1 border rounded">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.menuItemId,
                                  item.quantity + 1
                                )
                              }
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <PlusIcon className="w-4 h-4" />
                            </button>
                          </div>
                          <span className="font-medium">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t bg-gray-50">
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Your name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold">Total:</span>
                    <span className="text-xl font-bold text-blue-600">
                      {formatPrice(getTotalPrice())}
                    </span>
                  </div>

                  <button
                    onClick={placeOrder}
                    disabled={ordering}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {ordering ? "Placing Order..." : "Place Order"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
