"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";

export default function LoginPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid credentials");
      } else {
        toast.success("Login successful!");
        router.push("/dashboard");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 ${
        theme === "dark"
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
          : "bg-gradient-to-br"
      }`}
      style={{
        background:
          theme === "dark"
            ? undefined
            : "linear-gradient(145deg, #193E72 0%, #FEB203 100%)",
      }}
    >
      {/* login form start*/}
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="mx-auto mb-8 mt-8 flex items-center justify-center">
              {/* <Image
                src={
                  theme === "dark"
                    ? "/assets/image/logo-light.png"
                    : "/assets/image/logo.png"
                }
                alt="Acute-RPOS Logo"
                width={280}
                height={280}
                className="object-contain"
                priority
              /> */}
              <img
                src={
                  theme === "dark"
                    ? "/assets/image/logo-light.png"
                    : "/assets/image/logo.png"
                }
                alt="Acute-RPOS Logo"
                width={280}
                height={280}
                className="object-contain"
                
              />
            </div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Sign in to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                required
                className="input"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                required
                className="input"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-3 text-lg"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            <p>Demo Credentials:</p>
            <p className="font-mono text-xs mt-2">
              admin@restaurant.com / admin123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
