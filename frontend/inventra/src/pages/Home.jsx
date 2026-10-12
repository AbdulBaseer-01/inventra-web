"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, MotionConfig } from "framer-motion";

/* ------------------------------------------------------------------ */
/* Design tokens (Tailwind arbitrary values keep this file standalone) */
/*   bg      #FAFAF7   ink  #111111   muted  #6B6B66                   */
/*   line    #E7E6E0   accent (muted teal) #2F6F62                      */
/* ------------------------------------------------------------------ */

const BRAND = "Inventra";

const INVENTORY = [
  { name: "Amul Milk", stock: 24, status: "Available" },
  { name: "Aashirvaad Atta", stock: 12, status: "Available" },
  { name: "Dettol", stock: 4, status: "Low stock" },
  { name: "Biscuits", stock: 0, status: "Out of stock" },
];

const STATUS_STYLES = {
  Available: "bg-[#2F6F62]",
  "Low stock": "bg-[#B7791F]",
  "Out of stock": "bg-[#B4443A]",
};

const reveal = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5, ease: "easeOut" },
};

/* ---------------------------- Shared bits ---------------------------- */

function PrimaryLink({ href, children }) {
  return (
    <motion.span whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} className="inline-block">
      <Link
        to={href}
        className="inline-flex h-12 items-center rounded-md bg-[#2F6F62] px-6 text-[15px] font-medium text-white transition-colors hover:bg-[#275c52] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F6F62]"
      >
        {children}
      </Link>
    </motion.span>
  );
}

function SecondaryLink({ href, children }) {
  return (
    <Link
      to={href}
      className="inline-flex h-12 items-center rounded-md border border-[#E7E6E0] bg-white px-6 text-[15px] font-medium text-[#111111] transition-colors hover:border-[#111111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F6F62]"
    >
      {children}
    </Link>
  );
}

function StatusDot({ status }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-[#111111]">
      <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[status]}`} />
      {status}
    </span>
  );
}

/* Window chrome used by every product mockup */
function Panel({ title, children, className = "" }) {
  return (
    <div
      className={`overflow-hidden rounded-lg border border-[#E7E6E0] bg-white shadow-[0_1px_2px_rgba(17,17,17,0.04)] ${className}`}
    >
      <div className="flex items-center justify-between border-b border-[#E7E6E0] px-5 py-3">
        <span className="text-sm font-medium text-[#111111]">{title}</span>
        <span className="text-xs text-[#6B6B66]">Abdul General Store</span>
      </div>
      {children}
    </div>
  );
}

function InventoryTable() {
  return (
    <Panel title="Inventory">
      <div className="grid grid-cols-[1fr_64px_120px] gap-x-4 border-b border-[#E7E6E0] px-5 py-2 text-xs text-[#6B6B66] sm:grid-cols-[1fr_80px_140px]">
        <span>Product</span>
        <span className="text-right">Stock</span>
        <span>Status</span>
      </div>
      <ul>
        {INVENTORY.map((item) => (
          <li
            key={item.name}
            className="grid grid-cols-[1fr_64px_120px] items-center gap-x-4 border-b border-[#E7E6E0] px-5 py-3.5 last:border-b-0 sm:grid-cols-[1fr_80px_140px]"
          >
            <span className="truncate text-sm font-medium">{item.name}</span>
            <span className="text-right text-sm tabular-nums">{item.stock}</span>
            <StatusDot status={item.status} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function SectionHeading({ title, children }) {
  return (
    <div className="max-w-xl">
      <h2 className="text-3xl font-semibold tracking-tight text-[#111111] sm:text-4xl md:text-[44px] md:leading-[1.1]">
        {title}
      </h2>
      <p className="mt-5 max-w-md text-base leading-relaxed text-[#6B6B66]">{children}</p>
    </div>
  );
}

/* ------------------------------ Sections ----------------------------- */

function Header() {
  return (
    <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
      <Link to="/" className="text-lg font-semibold tracking-tight">
        {BRAND}
      </Link>
      <nav className="flex items-center gap-5 text-sm">
        <Link to="/signin" className="text-[#6B6B66] transition-colors hover:text-[#111111]">
          Sign in
        </Link>
        <Link
          to="/signup"
          className="rounded-md bg-[#111111] px-4 py-2 font-medium text-white transition-colors hover:bg-[#2F6F62]"
        >
          Create store
        </Link>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-12 sm:px-8 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pb-28">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#2F6F62]">
          Local commerce, simplified
        </p>
        <h1 className="mt-5 text-[40px] font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-[60px]">
          Your shelves, online for the people nearby.
        </h1>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-[#6B6B66]">
          Keep track of your stock, choose which products customers can see, and
          take orders from people who live around your store.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <PrimaryLink href="/signup">Create your store</PrimaryLink>
          <SecondaryLink href="/signin">Sign in</SecondaryLink>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
        className="relative"
      >
        <InventoryTable />
        <div className="mt-3 flex items-center justify-between rounded-lg border border-[#E7E6E0] bg-white px-5 py-3 text-sm sm:ml-12">
          <span className="text-[#6B6B66]">New order · 2 items</span>
          <span className="font-medium text-[#2F6F62]">Accept</span>
        </div>
      </motion.div>
    </section>
  );
}

const STEPS = [
  { n: "01", title: "Add your inventory", text: "Enter what you stock and how many you have." },
  { n: "02", title: "Choose what to sell", text: "List only the products you want customers to see." },
  { n: "03", title: "Receive orders", text: "Nearby customers order. You pack, a delivery partner collects." },
];

function Steps() {
  return (
    <section className="border-y border-[#E7E6E0] bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-3 md:gap-8">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.n}
            {...reveal}
            transition={{ ...reveal.transition, delay: i * 0.08 }}
          >
            <span className="text-sm font-medium tabular-nums text-[#2F6F62]">{s.n}</span>
            <h3 className="mt-3 text-xl font-semibold tracking-tight">{s.title}</h3>
            <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-[#6B6B66]">{s.text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function InventorySection() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 md:py-28 lg:grid-cols-2 lg:gap-20">
      <motion.div {...reveal}>
        <SectionHeading title="Know exactly what's in your store.">
          Every product, every count, in one list. See what is running low before
          a customer finds it out of stock.
        </SectionHeading>
      </motion.div>
      <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.1 }}>
        <InventoryTable />
      </motion.div>
    </section>
  );
}

function ListingSection() {
  const [rows, setRows] = useState([
    { name: "Milk", inventory: 24, listed: true },
    { name: "Rice", inventory: 18, listed: true },
    { name: "Shampoo", inventory: 5, listed: false },
  ]);

  const toggle = (name) =>
    setRows((r) => r.map((x) => (x.name === name ? { ...x, listed: !x.listed } : x)));

  return (
    <section className="border-y border-[#E7E6E0] bg-white">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 md:py-28 lg:grid-cols-2 lg:gap-20">
        <motion.div {...reveal} className="lg:order-2">
          <SectionHeading title="Your inventory is yours. Your marketplace is what customers see.">
            Stock everything you carry. Switch on only the products you want to
            sell to nearby customers, and switch them off any time.
          </SectionHeading>
        </motion.div>

        <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.1 }} className="lg:order-1">
          <Panel title="Listings">
            <div className="grid grid-cols-[1fr_80px_72px] gap-x-4 border-b border-[#E7E6E0] px-5 py-2 text-xs text-[#6B6B66]">
              <span>Product</span>
              <span className="text-right">Inventory</span>
              <span className="text-right">Listed</span>
            </div>
            <ul>
              {rows.map((r) => (
                <li
                  key={r.name}
                  className="grid grid-cols-[1fr_80px_72px] items-center gap-x-4 border-b border-[#E7E6E0] px-5 py-3.5 last:border-b-0"
                >
                  <span className="text-sm font-medium">{r.name}</span>
                  <span className="text-right text-sm tabular-nums">{r.inventory}</span>
                  <span className="flex items-center justify-end gap-2">
                    <span className="w-6 text-xs text-[#6B6B66]">{r.listed ? "ON" : "OFF"}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={r.listed}
                      aria-label={`List ${r.name}`}
                      onClick={() => toggle(r.name)}
                      className={`relative h-5 w-9 rounded-full transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F6F62] ${
                        r.listed ? "bg-[#2F6F62]" : "bg-[#D6D5CE]"
                      }`}
                    >
                      <motion.span
                        layout
                        transition={{ duration: 0.25 }}
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white ${
                          r.listed ? "right-0.5" : "left-0.5"
                        }`}
                      />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </motion.div>
      </div>
    </section>
  );
}

function CustomersSection() {
  const results = [
    { distance: "Under 5 km", store: "Abdul General Store", price: "₹32" },
    { distance: "Over 5 km", store: "City Mart", price: "₹30" },
  ];
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 md:py-28 lg:grid-cols-2 lg:gap-20">
      <motion.div {...reveal}>
        <SectionHeading title="Found by the people who live nearby.">
          Customers search for a product in the mobile app and see which stores
          close to them have it. Closest stores come first.
        </SectionHeading>
      </motion.div>

      <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.1 }}>
        <div className="rounded-lg border border-[#E7E6E0] bg-white p-5 shadow-[0_1px_2px_rgba(17,17,17,0.04)]">
          <div className="flex h-11 items-center rounded-md border border-[#E7E6E0] bg-[#FAFAF7] px-4 text-sm">
            <span className="text-[#6B6B66]">Search</span>
            <span className="ml-3 font-medium">milk</span>
          </div>
          <p className="mb-2 mt-6 text-xs text-[#6B6B66]">Nearby stores</p>
          <ul className="divide-y divide-[#E7E6E0]">
            {results.map((r) => (
              <li key={r.store} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="text-xs text-[#6B6B66]">{r.distance}</p>
                  <p className="mt-0.5 text-[15px] font-medium">{r.store}</p>
                  <p className="text-sm text-[#6B6B66]">Milk · {r.price}</p>
                </div>
                <StatusDot status="Available" />
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="border-t border-[#E7E6E0] bg-white">
      <motion.div {...reveal} className="mx-auto max-w-6xl px-5 py-24 sm:px-8 md:py-32">
        <h2 className="max-w-2xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">
          Ready to put your store online?
        </h2>
        <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
          <PrimaryLink href="/signup">Create your store</PrimaryLink>
          <p className="text-[15px] text-[#6B6B66]">
            Already have an account?{" "}
            <Link to="/signin" className="font-medium text-[#111111] underline underline-offset-4 hover:text-[#2F6F62]">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#E7E6E0]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-[#6B6B66] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span className="font-semibold text-[#111111]">{BRAND}</span>
        <nav className="flex gap-6">
          <Link to="/signin" className="hover:text-[#111111]">Sign in</Link>
          <Link to="/signup" className="hover:text-[#111111]">Create store</Link>
        </nav>
        <span>© {new Date().getFullYear()} {BRAND}</span>
      </div>
    </footer>
  );
}

/* -------------------------------- Page -------------------------------- */

export default function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen overflow-x-hidden bg-[#FAFAF7] font-sans text-[#111111] antialiased">
        <Header />
        <main>
          <Hero />
          <Steps />
          <InventorySection />
          <ListingSection />
          <CustomersSection />
          <FinalCta />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}