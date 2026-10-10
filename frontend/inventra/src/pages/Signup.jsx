"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";

const BRAND = "Shelfline";

const CATEGORIES = [
  { id: "grocery", label: "Grocery" },
  { id: "electronics", label: "Electronics" },
  { id: "hardware", label: "Hardware" },
  { id: "plumbing", label: "Plumbing" },
  { id: "pharmacy", label: "Pharmacy" },
  { id: "stationery", label: "Stationery" },
  { id: "general-store", label: "General Store" },
  { id: "other", label: "Other" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/; // 10-digit Indian mobile number
const PINCODE_RE = /^[1-9]\d{5}$/;

const INITIAL = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  storeName: "",
  categoryId: "",
  address: "",
  area: "",
  city: "",
  pincode: "",
};

function validate(v, location) {
  const e = {};
  if (!v.name.trim()) e.name = "Enter your full name.";
  if (!v.email.trim()) e.email = "Enter your email.";
  else if (!EMAIL_RE.test(v.email)) e.email = "Enter a valid email address.";
  if (!v.phone.trim()) e.phone = "Enter your phone number.";
  else if (!PHONE_RE.test(v.phone.replace(/\s/g, ""))) e.phone = "Enter a valid 10-digit mobile number.";
  if (!v.password) e.password = "Create a password.";
  else if (v.password.length < 8) e.password = "Use at least 8 characters.";
  if (!v.confirmPassword) e.confirmPassword = "Confirm your password.";
  else if (v.confirmPassword !== v.password) e.confirmPassword = "Passwords don't match.";

  if (!v.storeName.trim()) e.storeName = "Enter your store name.";
  if (!v.categoryId) e.categoryId = "Choose a business category.";

  if (!v.address.trim()) e.address = "Enter the store address.";
  if (!v.area.trim()) e.area = "Enter the area.";
  if (!v.city.trim()) e.city = "Enter the city.";
  if (!v.pincode.trim()) e.pincode = "Enter the pincode.";
  else if (!PINCODE_RE.test(v.pincode)) e.pincode = "Enter a valid 6-digit pincode.";

  if (location.mode === "current" && location.status !== "detected") {
    e.location = "Detect your location, or switch to manual entry.";
  }
  return e;
}

// Matches the request body the Express API will receive.
function buildPayload(v, location) {
  return {
    name: v.name.trim(),
    email: v.email.trim(),
    phone: v.phone.replace(/\s/g, ""),
    password: v.password,
    store: {
      name: v.storeName.trim(),
      categoryId: v.categoryId,
      address: v.address.trim(),
      area: v.area.trim(),
      city: v.city.trim(),
      pincode: v.pincode,
      latitude: location.mode === "current" ? location.latitude : null,
      longitude: location.mode === "current" ? location.longitude : null,
    },
  };
}

/* ------------------------------ UI pieces ----------------------------- */

const inputClass = (hasError) =>
  `h-12 w-full rounded-md border bg-white px-4 text-[15px] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[#A5A49D] focus:border-[#2F6F62] focus:shadow-[0_0_0_3px_rgba(47,111,98,0.12)] ${hasError ? "border-[#B4443A]" : "border-[#E7E6E0]"
  }`;

function Field({ id, label, error, hint, className = "", children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-sm text-[#6B6B66]">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-[#B4443A]">
          {error}
        </p>
      )}
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="grid gap-6 border-t border-[#E7E6E0] py-10 md:grid-cols-[220px_1fr] md:gap-10">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-1.5 text-sm leading-relaxed text-[#6B6B66]">{description}</p>}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/* -------------------------------- Page -------------------------------- */

export default function SignUpPage() {
  const [values, setValues] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState({
    mode: "manual", // "current" | "manual"
    status: "idle", // "idle" | "detecting" | "detected" | "failed"
    latitude: null,
    longitude: null,
  });

  const bind = (name) => ({
    id: name,
    name,
    value: values[name],
    onChange: (e) => {
      setValues((v) => ({ ...v, [name]: e.target.value }));
      if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
    },
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
    className: inputClass(errors[name]),
  });

  const detectLocation = () => {
    setLocation({ mode: "current", status: "detecting", latitude: null, longitude: null });
    setErrors((er) => ({ ...er, location: undefined }));

    if (!("geolocation" in navigator)) {
      setLocation((l) => ({ ...l, status: "failed" }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        setLocation({
          mode: "current",
          status: "detected",
          latitude: Number(coords.latitude.toFixed(6)),
          longitude: Number(coords.longitude.toFixed(6)),
        }),
      () => setLocation((l) => ({ ...l, status: "failed" })),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const chooseManual = () => {
    setLocation({ mode: "manual", status: "idle", latitude: null, longitude: null });
    setErrors((er) => ({ ...er, location: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const found = validate(values, location);
    setErrors(found);
    if (Object.keys(found).length) {
      // Move focus to the first invalid field
      const first = Object.keys(found).find((k) => k !== "location");
      if (first) document.getElementById(first)?.focus();
      return;
    }

    const payload = buildPayload(values, location);
    setSubmitting(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/register-store",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      alert("Account and store registered successfully!");

      console.log("Registration successful:", data);

      // Clear the form after successful registration
      setValues(INITIAL);
      setErrors({});
      setLocation({
        mode: "manual",
        status: "idle",
        latitude: null,
        longitude: null,
      });

    } catch (error) {
      console.error("Registration error:", error);

      alert(error.message || "Unable to register. Please try again.");

    } finally {
      setSubmitting(false);
    }
  };

  const modeButton = (active) =>
    `flex-1 rounded-md border px-4 py-3 text-left text-[15px] font-medium transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F6F62] ${active ? "border-[#2F6F62] bg-[#F1F6F4]" : "border-[#E7E6E0] bg-white hover:border-[#111111]"
    }`;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#FAFAF7] font-sans text-[#111111] antialiased">
        <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            {BRAND}
          </Link>
          <Link to="/signin" className="text-sm text-[#6B6B66] hover:text-[#111111]">
            Sign in
          </Link>
        </header>

        <motion.main
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto max-w-3xl px-5 pb-20 pt-8 sm:px-8"
        >
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Create your store</h1>
          <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-[#6B6B66]">
            Manage your inventory and sell products to customers nearby. Setup takes a few minutes.
          </p>

          <form onSubmit={onSubmit} noValidate className="mt-10">
            {/* 1. Owner */}
            <Section title="Owner details" description="Who will manage this store.">
              <Field id="name" label="Full name" error={errors.name} className="sm:col-span-2">
                <input type="text" autoComplete="name" {...bind("name")} />
              </Field>
              <Field id="email" label="Email" error={errors.email}>
                <input type="email" autoComplete="email" {...bind("email")} />
              </Field>
              <Field id="phone" label="Phone number" error={errors.phone}>
                <input type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="9876543210" {...bind("phone")} />
              </Field>
              <Field id="password" label="Password" error={errors.password} hint="At least 8 characters.">
                <input type="password" autoComplete="new-password" {...bind("password")} />
              </Field>
              <Field id="confirmPassword" label="Confirm password" error={errors.confirmPassword}>
                <input type="password" autoComplete="new-password" {...bind("confirmPassword")} />
              </Field>
            </Section>

            {/* 2. Store */}
            <Section title="Store details" description="How customers will see your store.">
              <Field id="storeName" label="Store name" error={errors.storeName}>
                <input type="text" autoComplete="organization" {...bind("storeName")} />
              </Field>
              <Field id="categoryId" label="Business category" error={errors.categoryId}>
                <select {...bind("categoryId")}>
                  <option value="">Select a category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
            </Section>

            {/* 3. Location */}
            <Section title="Store location" description="Customers nearby find you through this.">
              <Field id="address" label="Address" error={errors.address} className="sm:col-span-2">
                <input type="text" autoComplete="street-address" {...bind("address")} />
              </Field>
              <Field id="area" label="Area" error={errors.area}>
                <input type="text" {...bind("area")} />
              </Field>
              <Field id="city" label="City" error={errors.city}>
                <input type="text" autoComplete="address-level2" {...bind("city")} />
              </Field>
              <Field id="pincode" label="Pincode" error={errors.pincode}>
                <input type="text" inputMode="numeric" maxLength={6} autoComplete="postal-code" {...bind("pincode")} />
              </Field>

              <div className="sm:col-span-2">
                <p className="text-sm font-medium">Map position</p>
                <p className="mt-1 text-sm text-[#6B6B66]">Use your current location if you're at the store.</p>

                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={detectLocation} aria-pressed={location.mode === "current"} className={modeButton(location.mode === "current")}>
                    Use my current location
                  </button>
                  <button type="button" onClick={chooseManual} aria-pressed={location.mode === "manual"} className={modeButton(location.mode === "manual")}>
                    Enter location manually
                  </button>
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  {location.mode === "current" && (
                    <motion.div
                      key={location.status}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      aria-live="polite"
                      className="mt-3 rounded-md border border-[#E7E6E0] bg-white px-4 py-3 text-sm"
                    >
                      {location.status === "detecting" && <span className="text-[#6B6B66]">Detecting location...</span>}
                      {location.status === "failed" && (
                        <span className="text-[#B4443A]">
                          Couldn't get your location. Allow location access in your browser, or enter it manually.
                        </span>
                      )}
                      {location.status === "detected" && (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-2 font-medium text-[#2F6F62]">
                            <span className="h-2 w-2 rounded-full bg-[#2F6F62]" />
                            Location detected
                          </span>
                          <span className="tabular-nums text-[#6B6B66]">
                            {location.latitude}, {location.longitude}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {errors.location && (
                  <p role="alert" className="mt-2 text-sm text-[#B4443A]">
                    {errors.location}
                  </p>
                )}
              </div>
            </Section>

            <div className="border-t border-[#E7E6E0] pt-8">
              <motion.button
                type="submit"
                disabled={submitting}
                whileHover={submitting ? undefined : { y: -1 }}
                whileTap={submitting ? undefined : { scale: 0.98 }}
                className="h-12 w-full rounded-md bg-[#2F6F62] px-8 text-[15px] font-medium text-white transition-colors hover:bg-[#275c52] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F6F62] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {submitting ? "Creating store..." : "Create store"}
              </motion.button>

              <p className="mt-6 text-[15px] text-[#6B6B66]">
                Already have an account?{" "}
                <Link to="/signin" className="font-medium text-[#111111] underline underline-offset-4 hover:text-[#2F6F62]">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </motion.main>
      </div>
    </MotionConfig>
  );
}