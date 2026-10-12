"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, MotionConfig } from "framer-motion";
import { apiRequest } from "../lib/api.js";

const BRAND = "Inventra";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = "Enter your email.";
  else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";
  if (!password) errors.password = "Enter your password.";
  return errors;
}

function Field({ id, label, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-[#B4443A]">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass = (hasError) =>
  `h-12 w-full rounded-md border bg-white px-4 text-[15px] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[#A5A49D] focus:border-[#2F6F62] focus:shadow-[0_0_0_3px_rgba(47,111,98,0.12)] ${
    hasError ? "border-[#B4443A]" : "border-[#E7E6E0]"
  }`;

export default function SignInPage() {
  // Shape matches what an Express /auth/login route will expect.
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const navigate = useNavigate();

  const onChange = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    setFormError("");
    try {
      await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="grid min-h-screen bg-[#FAFAF7] font-sans text-[#111111] antialiased lg:grid-cols-[1fr_1fr]">
        {/* Brand side: hidden on mobile so the form is the focus */}
        <aside className="hidden flex-col justify-between border-r border-[#E7E6E0] bg-white p-12 lg:flex xl:p-16">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            {BRAND}
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight xl:text-6xl">
              Your store,
              <br />
              one place.
            </h1>
            <p className="mt-6 max-w-sm text-lg leading-relaxed text-[#6B6B66]">
              Manage inventory, listings and orders from a single dashboard.
            </p>
          </motion.div>
          <p className="text-sm text-[#6B6B66]">© {new Date().getFullYear()} {BRAND}</p>
        </aside>

        <main className="flex flex-col px-5 py-8 sm:px-10">
          <Link to="/" className="text-lg font-semibold tracking-tight lg:hidden">
            {BRAND}
          </Link>

          <div className="flex flex-1 items-center justify-center py-10">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-full max-w-sm"
            >
              <h2 className="text-3xl font-semibold tracking-tight">Sign in</h2>
              <p className="mt-2 text-[15px] text-[#6B6B66]">Welcome back. Enter your details to continue.</p>
              {formError && (
                <p role="alert" className="mt-4 rounded-md bg-[#FDF0EE] px-3 py-2 text-sm text-[#B4443A]">
                  {formError}
                </p>
              )}

              <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
                <Field id="email" label="Email" error={errors.email}>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={values.email}
                    onChange={onChange}
                    placeholder="you@yourstore.com"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    className={inputClass(errors.email)}
                  />
                </Field>

                <Field id="password" label="Password" error={errors.password}>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={values.password}
                    onChange={onChange}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    className={inputClass(errors.password)}
                  />
                </Field>

                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-sm text-[#6B6B66] underline-offset-4 hover:text-[#111111] hover:underline">
                    Forgot password?
                  </Link>
                </div>

                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={submitting ? undefined : { y: -1 }}
                  whileTap={submitting ? undefined : { scale: 0.98 }}
                  className="h-12 w-full rounded-md bg-[#2F6F62] text-[15px] font-medium text-white transition-colors hover:bg-[#275c52] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F6F62] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Signing in..." : "Sign in"}
                </motion.button>
              </form>

              <p className="mt-8 text-center text-[15px] text-[#6B6B66]">
                Don't have a store yet?{" "}
                <Link to="/signup" className="font-medium text-[#111111] underline underline-offset-4 hover:text-[#2F6F62]">
                  Create your store
                </Link>
              </p>
            </motion.div>
          </div>
        </main>
      </div>
    </MotionConfig>
  );
}