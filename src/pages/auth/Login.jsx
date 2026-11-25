import React, { useState } from "react";
import { ROUTES } from '@/lib/routes';
import { setSession } from '@/lib/session';
import { useNavigate } from "react-router-dom";
import axios from "@/api/client";
import Logo from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/common/FormField";
import { Notice } from "@/components/common/Notice";
import { Activity, Boxes, Eye, EyeOff, Lock, TriangleAlert, User, Wallet } from "lucide-react";

// Laid out like the Sign in design: form on the left, brand panel on the right (hidden below lg). Sign-in logic unchanged.
const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const features = [
    [<Activity className="size-[18px]" />, "Live attendance"],
    [<Wallet className="size-[18px]" />, "Payroll"],
    [<Boxes className="size-[18px]" />, "Materials"],
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

      setSession({ token: data.token, user: userToSave });

      navigate(ROUTES.dashboard);
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

  return (
    <div className="flex min-h-screen flex-wrap bg-surface">
      <main className="flex min-w-0 flex-[1_1_420px] items-center justify-center px-6 py-12">
        <div className="flex w-full max-w-[380px] flex-col gap-6">
          <Logo width={300} height={100} priority className="h-auto w-[300px] max-w-full" />
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-primary">Sign in</h1>
            <p className="mt-1.5 text-body-lg text-ink-3">Welcome back. Use your username and password.</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {error ? (
              <Notice tone="bad" icon={TriangleAlert} role="alert">
                {error}
              </Notice>
            ) : null}

            <FormField label="Username" htmlFor="login-username">
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 z-10 size-[18px] -translate-y-1/2 text-ink-3" />
                <Input id="login-username" type="text" placeholder="Enter your username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} required className="pl-[38px]" />
              </div>
            </FormField>

            <FormField label="Password" htmlFor="login-password">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 size-[18px] -translate-y-1/2 text-ink-3" />
                <Input id="login-password" type={showPassword ? "text" : "password"} placeholder="Enter your password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required className="px-[38px]" />
                <Button type="button" variant="ghost" size="icon" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute right-1 top-1/2 h-control-sm w-control-sm -translate-y-1/2 text-ink-3">
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </FormField>

            <Button type="submit" disabled={loading} className="!h-11 w-full">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="text-small text-ink-3">
            Need access?{" "}
            <a href="#" className="font-medium text-primary hover:underline">
              Contact support
            </a>
          </p>
        </div>
      </main>

      <aside className="hidden min-h-[420px] flex-[1_1_420px] flex-col justify-end gap-4 bg-primary p-14 text-primary-foreground lg:flex">
        <div className="text-[13px] font-semibold uppercase tracking-[0.08em] text-primary-foreground/70">Operations console</div>
        <div className="max-w-[440px] text-[32px] font-semibold leading-[1.2] tracking-tight">Attendance, payroll, projects and materials for every site, in one place.</div>
        <div className="mt-3 flex flex-wrap gap-6 text-body text-primary-foreground/80">
          {features.map(([icon, label]) => (
            <span key={label} className="inline-flex items-center gap-2">
              {icon}
              {label}
            </span>
          ))}
        </div>
      </aside>
    </div>
  );
};

export default Login;
