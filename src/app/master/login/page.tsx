"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  EyeIcon,
  EyeSlashIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";
import { useMasterAuth } from "@/contexts/MasterAuthContext";
import { useTheme } from "@/contexts/ThemeContext";

export default function MasterLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useMasterAuth();
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isAuthenticated) {
      router.push("/master");
    }
  }, [isAuthenticated, mounted, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent any parent form handlers
    setLoading(true);

    console.log("Master login attempt:", email);
    const success = await login(email, password);
    console.log("Login result:", success);

    if (success) {
      router.push("/master");
      router.refresh();
    }
    setLoading(false);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div className="relative flex lg:flex-row w-full h-screen justify-center flex-col dark:bg-gray-900 sm:p-0">
        {/* Left Side - Login Form */}
        <div className="flex flex-col flex-1 lg:w-1/2 w-full">
          <div className="w-full max-w-md sm:pt-10 mx-auto mb-5">
            <Link
              href="/login"
              className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <ChevronLeftIcon className="w-4 h-4 mr-1" />
              Back to Location Dashboard Login
            </Link>
          </div>
          <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-4 sm:px-0">
            <div>
              <div className="mb-5 sm:mb-8">
                <h1 className="mb-2 font-semibold text-gray-800 text-2xl dark:text-white/90 sm:text-3xl">
                  Sign In
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Enter your email and password to sign in!
                </p>
              </div>
              <div>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-6">
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        placeholder="info@gmail.com"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="password"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                          placeholder="Enter your password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          {showPassword ? (
                            <EyeSlashIcon className="w-5 h-5" />
                          ) : (
                            <EyeIcon className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="keepLoggedIn"
                          checked={keepLoggedIn}
                          onChange={(e) => setKeepLoggedIn(e.target.checked)}
                          className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <label
                          htmlFor="keepLoggedIn"
                          className="block text-sm font-normal text-gray-700 dark:text-gray-400 cursor-pointer"
                        >
                          Keep me logged in
                        </label>
                      </div>
                      <Link
                        href="/master/forgot-password"
                        className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-4 py-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loading ? "Signing in..." : "Sign in"}
                      </button>
                    </div>
                  </div>
                </form>

                <div className="mt-5">
                  <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                    Need help?{" "}
                    <Link
                      href="/login"
                      className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                    >
                      Contact Support
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Branded Area */}
        <div className="lg:w-1/2 w-full h-full bg-primary-900 dark:bg-white/5 lg:grid items-center hidden relative overflow-hidden">
          <div className="relative items-center justify-center flex z-1">
            {/* Grid Pattern Background */}
            <div className="absolute right-0 top-0 -z-1 w-full max-w-[250px] xl:max-w-[450px]">
              <Image
                width={540}
                height={254}
                src="/assets/image/shape/grid-01.svg"
                alt="grid"
              />
            </div>
            <div className="absolute bottom-0 left-0 -z-1 w-full max-w-[250px] rotate-180 xl:max-w-[450px]">
              <Image
                width={540}
                height={254}
                src="/assets/image/shape/grid-01.svg"
                alt="grid"
              />
            </div>
            {/* <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)
                `,
                backgroundSize: "90px 42px",
              }}
            />
            <div
              className="absolute right-0 top-0 w-full max-w-[250px] xl:max-w-[450px] h-full opacity-50"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: "90px 42px",
              }}
            />
            <div
              className="absolute bottom-0 left-0 w-full max-w-[250px] rotate-180 xl:max-w-[450px] h-full opacity-50"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: "90px 42px",
              }}
            /> */}
            <div className="flex flex-col items-center max-w-xs z-10">
              <div className="mb-6 flex items-center justify-center">
                {/* <Image
                  src="/assets/image/logo-light.png"
                  alt="Master Dashboard Logo"
                  width={64}
                  height={64}
                  className="object-contain"
                  priority
                /> */}
                <img
                  src={
                    theme === "dark"
                      ? "/assets/image/white_admin_logo.png"
                      : "/assets/image/white_admin_logo.png"
                  }
                  alt="Acute-RPOS Logo"
                  width={280}
                  height={280}
                  className="object-contain"
                />
              </div>
              {/* <h2 className="text-2xl text-white dark:text-white/90 mb-6 text-center">
                Acute Master Dashboard
              </h2>
              <p className="text-center text-gray-300 dark:text-white/60 text-sm">
                Sign in to manage your multi-tenant system
              </p> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
