import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../utils/axios";
import logo from "../assets/logo.png";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Users,
  ShieldCheck,
  BarChart3,
} from "lucide-react";

import { cn } from "@/lib/utils";

/*
  Palette (from the reference design)
  - Left panel bg:   #1c1512  (warm near-black)
  - Glow:            rgba(180, 90, 40, 0.28)
  - Right panel bg:  #f7f3ef  (warm off-white)
  - Accent orange:   #e87a30  (hover #d56d25)
  - Input bg:        #f7f3ef
*/

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const features = [
    [Users, "500 employees across 6 branches"],
    [BarChart3, "Live attendance & project analytics"],
    [ShieldCheck, "Role-based access for every team"],
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    setError("");
    setLoading(true);

    try {
      const res = await axios.post("/auth/login", {
        username,
        password,
      });

      const data = res.data;

      const userToSave = {
        ...data.user,
        _id: data.user.id || data.user._id,
      };

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(userToSave));
      localStorage.setItem("loginTime", Date.now());

      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);

      let errorMessage;

      if (err.code === "ERR_NETWORK" || err.message === "Network Error") {
        errorMessage =
          "Cannot connect to server. Please ensure the backend is running and accessible.";
      } else if (err.response?.status === 401) {
        errorMessage = "Invalid username or password. Please try again.";
      } else {
        errorMessage =
          err?.response?.data?.message ||
          err?.message ||
          "Login failed. Please try again.";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "h-[54px] w-full rounded-xl border border-stone-200 bg-[#f7f3ef] px-4 text-base text-stone-900 shadow-none placeholder:text-stone-500 focus-visible:border-[#e87a30] focus-visible:ring-2 focus-visible:ring-[#e87a30]/20";

  return (
    <div className="flex min-h-screen bg-[#f7f3ef]">
      {/* Left branding panel */}
      <aside className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-[#1c1512] p-[60px] lg:flex">
        {/* Warm glow, top right */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(700px 450px at 85% 0%, rgba(180, 90, 40, 0.28), transparent 70%)",
          }}
        />

        {/* Company branding */}
        <div className="relative flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#e87a30]">
            <img
              src={logo}
              alt="Laxmi PowerTech"
              className="max-h-7 max-w-7 object-contain"
            />
          </div>

          <div className="leading-tight">
            <div className="text-[15px] font-bold tracking-tight text-white">
              LAXMI POWERTECH
            </div>
            <div className="mt-0.5 text-[11px] font-medium tracking-[0.18em] text-stone-400">
              PRIVATE LIMITED
            </div>
          </div>
        </div>

        {/* Branding content */}
        <div className="relative max-w-xl">
          <h1 className="text-4xl font-bold leading-[1.2] tracking-tight text-white xl:text-[48px]">
            Workforce & operations, in one place.
          </h1>

          <p className="mt-6 max-w-lg text-base leading-7 text-stone-400">
            Attendance, leaves, projects, work orders and inventory across all
            your branches — tracked live.
          </p>

          <div className="mt-10 space-y-5">
            {features.map(([Icon, label]) => (
              <div
                key={label}
                className="flex items-center gap-4 text-base text-stone-100"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#e87a30]/15 text-[#e87a30]">
                  <Icon className="size-[18px]" strokeWidth={1.8} />
                </span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop footer */}
        <div className="relative text-sm text-stone-500">
          © 2026 Laxmi Power Tech. All rights reserved.
        </div>
      </aside>

      {/* Right login panel */}
      <main className="flex flex-1 items-center justify-center bg-[#f7f3ef] px-6 py-12 lg:px-12">
        <div className="w-full max-w-[500px]">
          {/* Mobile branding */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e87a30]">
              <img
                src={logo}
                alt="Laxmi PowerTech"
                className="max-h-6 max-w-6 object-contain"
              />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight text-stone-950">
                LAXMI POWERTECH
              </div>
              <div className="mt-0.5 text-[10px] font-medium tracking-[0.16em] text-stone-500">
                PRIVATE LIMITED
              </div>
            </div>
          </div>

          {/* Welcome heading */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-stone-950">
              Welcome back
            </h2>
            <p className="mt-2 text-base text-stone-600">
              Sign in to continue to your account
            </p>
          </div>

          {/* Login card */}
          <Card className="rounded-[20px] border border-stone-200 bg-white shadow-[0_1px_3px_rgba(28,21,18,0.05)]">
            <CardContent className="p-7 sm:p-[30px]">
              <form onSubmit={handleLogin} className="space-y-6">
                {/* Error message */}
                {error && (
                  <div
                    role="alert"
                    className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-500">
                      <span className="font-bold text-white">!</span>
                    </div>
                    <p className="text-sm font-medium text-red-700">{error}</p>
                  </div>
                )}

                {/* Username */}
                <div>
                  <label
                    htmlFor="login-username"
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-900"
                  >
                    <User className="size-4 text-stone-500" strokeWidth={1.8} />
                    Username
                  </label>
                  <Input
                    id="login-username"
                    type="text"
                    placeholder="Enter your username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    required
                    className={inputClass}
                  />
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="login-password"
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-900"
                  >
                    <Lock className="size-4 text-stone-500" strokeWidth={1.8} />
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                      className={cn(inputClass, "pr-12")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      aria-pressed={showPassword}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 transition-colors hover:text-stone-900"
                    >
                      {showPassword ? (
                        <EyeOff className="size-[18px]" />
                      ) : (
                        <Eye className="size-[18px]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Login button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "flex h-[54px] w-full items-center justify-center gap-2 rounded-xl",
                    "bg-[#e87a30] text-base font-bold tracking-wide text-white",
                    "shadow-none transition-colors hover:bg-[#d56d25]",
                    "focus-visible:ring-2 focus-visible:ring-[#e87a30] focus-visible:ring-offset-2",
                    loading && "cursor-not-allowed opacity-70",
                  )}
                >
                  {loading ? (
                    <>
                      <span className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Logging in...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="size-[18px]" />
                      <span>LOG IN</span>
                    </>
                  )}
                </Button>

                {/* Terms and privacy */}
                <div className="border-t border-stone-200 pt-5">
                  <p className="text-center text-sm leading-6 text-stone-600">
                    By logging in, you agree to our{" "}
                    <a
                      href="#"
                      className="font-medium text-[#e87a30] hover:underline"
                    >
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a
                      href="#"
                      className="font-medium text-[#e87a30] hover:underline"
                    >
                      Privacy Policy
                    </a>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Support */}
          <p className="mt-8 text-center text-base text-stone-600">
            Need help?{" "}
            <a
              href="#"
              className="font-semibold text-[#e87a30] hover:underline"
            >
              Contact Support
            </a>
          </p>

          {/* Mobile copyright */}
          <p className="mt-6 text-center text-xs text-stone-500 lg:hidden">
            © 2026 Laxmi Power Tech. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
