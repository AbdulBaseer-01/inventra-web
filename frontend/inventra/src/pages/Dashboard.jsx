import { useEffect, useMemo, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import { apiRequest, authenticatedRequest } from "../lib/api.js";



const CATEGORIES = ["All products", "Grocery", "Electronics", "Hardware", "Pharmacy", "Stationery", "Other"];

const EMPTY_PRODUCT = {

  name: "",

  category: "Grocery",

  description: "",

  imageUrl: "",

  price: "",

  weightValue: "",

  weightUnit: "kg",

  stock: "",

  discountType: "",

  discountValue: "",

};



function money(value) {

  return `₹${Number(value || 0).toFixed(2)}`;

}



function getTimeGreeting() {

  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";

  if (hour < 18) return "Good afternoon";

  return "Good evening";

}



function ProductForm({ initial, onCancel, onSaved }) {

  const [values, setValues] = useState(initial || EMPTY_PRODUCT);

  const [error, setError] = useState("");

  const [saving, setSaving] = useState(false);



  const change = (name, value) => setValues((current) => ({ ...current, [name]: value }));



  const submit = async (event) => {

    event.preventDefault();

    setError("");

    setSaving(true);

    const payload = {

      name: values.name,

      category: values.category,

      description: values.description,

      imageUrl: values.imageUrl,

      price: Number(values.price),

      weightValue: Number(values.weightValue),

      weightUnit: values.weightUnit,

      stock: Number(values.stock),

      discount: values.discountType

        ? { type: values.discountType, value: Number(values.discountValue) }

        : null,

    };



    try {

      const data = await apiRequest(

        initial?.id ? `/api/products/${initial.id}` : "/api/products",

        { method: initial?.id ? "PATCH" : "POST", body: JSON.stringify(payload) }

      );

      onSaved(data.product);

    } catch (requestError) {

      setError(requestError.message);

    } finally {

      setSaving(false);

    }

  };



  const field = (label, name, type = "text", props = {}) => (

    <label className="grid gap-1.5 text-sm font-medium">

      {label}

      <input

        type={type}

        value={values[name]}

        onChange={(event) => change(name, event.target.value)}

        className="h-11 rounded-md border border-[#E7E6E0] bg-white px-3 outline-none focus:border-[#2F6F62]"

        {...props}

      />

    </label>

  );



  return (

    <form onSubmit={submit} className="rounded-lg border border-[#E7E6E0] bg-white p-5 sm:p-6">

      <div className="flex items-start justify-between gap-4">

        <div>

          <h2 className="text-xl font-semibold">{initial ? "Edit product" : "Add a product"}</h2>

          <p className="mt-1 text-sm text-[#6B6B66]">Fill in the details customers need to make a decision.</p>

        </div>

        <button type="button" onClick={onCancel} className="text-sm text-[#6B6B66] hover:text-[#111111]">Close</button>

      </div>

      {error && <p role="alert" className="mt-4 rounded-md bg-[#FDF0EE] px-3 py-2 text-sm text-[#B4443A]">{error}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">

        {field("Product name", "name", "text", { required: true, placeholder: "e.g. Basmati rice" })}

        <label className="grid gap-1.5 text-sm font-medium">

          Category

          <select value={values.category} onChange={(event) => change("category", event.target.value)} className="h-11 rounded-md border border-[#E7E6E0] bg-white px-3">

            {CATEGORIES.slice(1).map((category) => <option key={category}>{category}</option>)}

          </select>

        </label>

        {field("Price (₹)", "price", "number", { min: "0", step: "0.01", required: true, placeholder: "0.00" })}

        {field("Available stock", "stock", "number", { min: "0", step: "1", required: true, placeholder: "0" })}

        <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">

          {field("Weight or quantity", "weightValue", "number", { min: "0.01", step: "0.01", required: true, placeholder: "1" })}

          <label className="grid gap-1.5 text-sm font-medium">

            Unit

            <select value={values.weightUnit} onChange={(event) => change("weightUnit", event.target.value)} className="h-11 rounded-md border border-[#E7E6E0] bg-white px-2">

              <option value="kg">kg</option><option value="g">g</option><option value="l">l</option><option value="ml">ml</option><option value="piece">piece</option>

            </select>

          </label>

        </div>

        {field("Product image URL (optional)", "imageUrl", "url", { placeholder: "https://..." })}

        <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">

          Description (optional)

          <textarea value={values.description} onChange={(event) => change("description", event.target.value)} rows="3" className="rounded-md border border-[#E7E6E0] bg-white px-3 py-2 outline-none focus:border-[#2F6F62]" placeholder="Tell customers what makes this product useful." />

        </label>

      </div>

      <div className="mt-6 rounded-md bg-[#F8FAF9] p-4">

        <h3 className="font-semibold">Discount (optional)</h3>

        <p className="mt-1 text-sm text-[#6B6B66]">You can remove this discount at any time by choosing “No discount”.</p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">

          <select value={values.discountType} onChange={(event) => change("discountType", event.target.value)} className="h-11 rounded-md border border-[#E7E6E0] bg-white px-3">

            <option value="">No discount</option><option value="percent">Percentage (%)</option><option value="amount">Fixed amount (₹)</option>

          </select>

          {values.discountType && field("Discount value", "discountValue", "number", { min: "0.01", step: "0.01", required: true, placeholder: "10" })}

        </div>

      </div>

      <div className="mt-6 flex flex-wrap gap-3">

        <button disabled={saving} className="h-11 rounded-md bg-[#2F6F62] px-5 text-sm font-medium text-white hover:bg-[#275c52] disabled:opacity-60">{saving ? "Saving..." : initial ? "Save changes" : "Add product"}</button>

        <button type="button" onClick={onCancel} className="h-11 rounded-md border border-[#E7E6E0] px-5 text-sm font-medium hover:border-[#111111]">Cancel</button>

      </div>

    </form>

  );

}



function ProductTable({ products, onEdit, onDelete }) {
  if (!products.length) {
    return (
      <div className="rounded-xl border border-dashed border-[#D8D2C9] bg-white p-8 text-center sm:p-12">
        <p className="font-medium text-[#26231F]">No products here yet</p>
        <p className="mt-2 text-sm text-[#817A70]">Add a product to start building your catalogue.</p>
      </div>
    );
  }

  const getSalePrice = (product) => {
    if (product.discount?.type === "percent") {
      return product.price * (1 - product.discount.value / 100);
    }
    if (product.discount?.type === "amount") {
      return product.price - product.discount.value;
    }
    return product.price;
  };

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-[#E4DED5] bg-white">
      {/* Mobile layout: cards avoid forcing the page wider than the screen. */}
      <div className="divide-y divide-[#EEE9E2] sm:hidden">
        {products.map((product) => {
          const salePrice = getSalePrice(product);
          const lowStock = product.stock <= 5;
          const hasDiscount = Boolean(product.discount);

          return (
            <article key={product.id} className="min-w-0 p-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F0ECE6] text-lg text-[#9A9288]">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name || ""} className="h-full w-full object-cover" />
                  ) : "▧"}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-sm font-semibold text-[#26231F]">{product.name}</h3>
                  <p className="mt-1 break-words text-xs text-[#817A70]">{product.category || "Uncategorised"}</p>
                  {product.weightValue ? (
                    <p className="mt-1 text-xs text-[#817A70]">{product.weightValue} {product.weightUnit}</p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-[#26231F]">{money(salePrice)}</p>
                  {hasDiscount && (
                    <p className="mt-1 text-xs text-[#817A70] line-through">{money(product.price)}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded-full px-2.5 py-1 font-medium ${lowStock ? "bg-[#FCE8E6] text-[#B5473C]" : "bg-[#E5F2E9] text-[#2F6F62]"}`}>
                  {lowStock ? `Low stock · ${product.stock} left` : `${product.stock} in stock`}
                </span>
                {hasDiscount ? (
                  <span className="rounded-full bg-[#F3EDFF] px-2.5 py-1 font-medium text-[#7653A8]">
                    {product.discount.type === "percent"
                      ? `${product.discount.value}% off`
                      : `${money(product.discount.value)} off`}
                  </span>
                ) : (
                  <span className="rounded-full bg-[#F5F2ED] px-2.5 py-1 text-[#817A70]">No discount</span>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={() => onEdit(product)} className="min-h-10 flex-1 rounded-lg border border-[#E4DED5] px-3 py-2 text-sm font-medium text-[#26231F] transition hover:bg-[#F8F6F2]">
                  Edit
                </button>
                <button onClick={() => onDelete(product.id)} className="min-h-10 rounded-lg border border-[#F0D5D1] px-3 py-2 text-sm font-medium text-[#B5473C] transition hover:bg-[#FFF5F4]">
                  Remove
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Tablet/desktop layout: fixed columns prevent accidental horizontal overflow. */}
      <div className="hidden min-w-0 sm:block">
        <table className="w-full table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[16%]" />
            <col className="w-[15%]" />
            <col className="w-[12%]" />
            <col className="w-[13%]" />
            <col className="w-[14%]" />
          </colgroup>
          <thead className="border-b border-[#EEE9E2] bg-[#FCFBF9] text-xs uppercase tracking-wide text-[#817A70]">
            <tr>
              <th className="px-3 py-3 font-medium lg:px-5">Product</th>
              <th className="px-2 py-3 font-medium lg:px-4">Category</th>
              <th className="px-2 py-3 font-medium lg:px-4">Price</th>
              <th className="px-2 py-3 font-medium lg:px-4">Stock</th>
              <th className="px-2 py-3 font-medium lg:px-4">Discount</th>
              <th className="px-2 py-3 text-right font-medium lg:px-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEE9E2]">
            {products.map((product) => {
              const salePrice = getSalePrice(product);
              const lowStock = product.stock <= 5;
              const hasDiscount = Boolean(product.discount);

              return (
                <tr key={product.id} className="transition-colors hover:bg-[#FCFBF9]">
                  <td className="px-3 py-4 lg:px-5">
                    <div className="flex min-w-0 items-center gap-2 lg:gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F0ECE6] text-lg text-[#9A9288]">
                        {product.imageUrl ? <img src={product.imageUrl} alt={product.name || ""} className="h-full w-full object-cover" /> : "▧"}
                      </div>
                      <div className="min-w-0">
                        <p className="break-words font-medium text-[#26231F]">{product.name}</p>
                        {product.weightValue ? <p className="mt-1 text-xs text-[#817A70]">{product.weightValue} {product.weightUnit}</p> : null}
                      </div>
                    </div>
                  </td>
                  <td className="break-words px-2 py-4 text-[#625C53] lg:px-4">{product.category}</td>
                  <td className="px-2 py-4 lg:px-4">
                    <p className="font-medium text-[#26231F]">{money(salePrice)}</p>
                    {hasDiscount && <p className="mt-1 text-xs text-[#817A70] line-through">{money(product.price)}</p>}
                  </td>
                  <td className="px-2 py-4 lg:px-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${lowStock ? "bg-[#FCE8E6] text-[#B5473C]" : "bg-[#E5F2E9] text-[#2F6F62]"}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="break-words px-2 py-4 text-[#625C53] lg:px-4">
                    {hasDiscount
                      ? product.discount.type === "percent" ? `${product.discount.value}%` : money(product.discount.value)
                      : "—"}
                  </td>
                  <td className="px-2 py-4 lg:px-4">
                    <div className="flex flex-wrap justify-end gap-1">
                      <button onClick={() => onEdit(product)} className="rounded-md px-2 py-1.5 text-xs font-medium text-[#7653A8] transition hover:bg-[#F3EDFF]">Edit</button>
                      <button onClick={() => onDelete(product.id)} className="rounded-md px-2 py-1.5 text-xs font-medium text-[#B5473C] transition hover:bg-[#FFF0EE]">Remove</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProfilePanel({ user, onClose, onSaved, onLogout }) {

  const [values, setValues] = useState({

    name: user.name || "",

    phone: user.phone || "",

    storeName: user.store?.name || "",

    avatar: user.avatar || "",

  });

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");



  const save = async (event) => {

    event.preventDefault();

    setSaving(true);

    setError("");

    try {

      const data = await authenticatedRequest("/api/auth/me", {

        method: "PATCH",

        body: JSON.stringify(values),

      });

      onSaved(data.user);

    } catch (requestError) {

      setError(requestError.message);

    } finally {

      setSaving(false);

    }

  };



  return (

    <div className="fixed inset-0 z-50 flex justify-end bg-[#26231F]/35 backdrop-blur-[2px]" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>

      <form onSubmit={save} className="h-full w-full max-w-md overflow-y-auto bg-[#FBFAF8] p-6 shadow-2xl sm:p-8">

        <div className="flex items-center justify-between">

          <div><p className="text-sm font-medium text-[#7653A8]">Account settings</p><h2 className="mt-1 text-2xl font-semibold">Your profile</h2></div>

          <button type="button" onClick={onClose} aria-label="Close profile" className="rounded-full p-2 text-xl text-[#817A70] transition hover:bg-[#EEEAE4] hover:text-[#26231F]">×</button>

        </div>

        <div className="mt-8 flex flex-col items-center">

          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#E9E2FA] text-3xl font-semibold text-[#7653A8] ring-4 ring-white shadow-lg">

            {values.avatar ? <img src={values.avatar} alt="Store profile" className="h-full w-full object-cover" /> : (values.name || "S").slice(0, 1).toUpperCase()}

          </div>

          <p className="mt-3 text-sm font-medium">Store profile picture</p>

          <p className="mt-1 text-center text-xs text-[#817A70]">Use a public image URL for your store logo or storefront.</p>

        </div>

        {error && <p role="alert" className="mt-6 rounded-lg bg-[#FDF0EE] px-3 py-2 text-sm text-[#B4443A]">{error}</p>}

        <div className="mt-7 grid gap-4">

          {[["Your name", "name", "text"], ["Phone number", "phone", "tel"], ["Store name", "storeName", "text"], ["Store image URL", "avatar", "url"]].map(([label, name, type]) => (

            <label key={name} className="grid gap-1.5 text-sm font-medium text-[#625C53]">{label}

              <input type={type} value={values[name]} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))} className="h-11 rounded-lg border border-[#E4DED5] bg-white px-3 text-[#26231F] outline-none transition focus:border-[#7653A8] focus:ring-4 focus:ring-[#E9E2FA]" required={name !== "avatar"} />

            </label>

          ))}

        </div>

        <div className="mt-8 flex gap-3">

          <button disabled={saving} className="flex-1 rounded-lg bg-[#26231F] px-4 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-[#4A4540] hover:shadow-lg disabled:opacity-60">{saving ? "Saving..." : "Save changes"}</button>

          <button type="button" onClick={onLogout} className="rounded-lg border border-[#E4DED5] px-4 py-3 text-sm font-medium text-[#B65B50] transition hover:border-[#B65B50]">Log out</button>

        </div>

      </form>

    </div>

  );

}



export default function Dashboard() {

  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  const [products, setProducts] = useState([]);

  const [activeCategory, setActiveCategory] = useState("All products");

  const [view, setView] = useState("overview");

  const [editing, setEditing] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);

  const [search, setSearch] = useState("");

  const [timeGreeting, setTimeGreeting] = useState("Good day");



  const loadProducts = () => authenticatedRequest("/api/products").then((data) => setProducts(data.products));



  useEffect(() => {

    Promise.all([authenticatedRequest("/api/auth/me"), loadProducts()])

      .then(([account]) => setUser(account.user))

      .catch(() => navigate("/signin", { replace: true }))

      .finally(() => setLoading(false));

  }, [navigate]);



  useEffect(() => {

    const closeOverlays = (event) => {

      if (event.key === "Escape") {

        setSidebarOpen(false);

        setProfileOpen(false);

      }

    };

    window.addEventListener("keydown", closeOverlays);

    return () => window.removeEventListener("keydown", closeOverlays);

  }, []);



  useEffect(() => {

    const updateGreeting = () => setTimeGreeting(getTimeGreeting());

    updateGreeting();

    const interval = window.setInterval(updateGreeting, 60 * 1000);

    return () => window.clearInterval(interval);

  }, []);



  const filteredProducts = useMemo(() => {

    const query = search.trim().toLowerCase();

    return products.filter((product) => {

      const matchesCategory = activeCategory === "All products" || product.category === activeCategory;

      const matchesSearch = !query || [product.name, product.category, product.description].some((value) => value?.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;

    });

  }, [activeCategory, products, search]);

  const discounts = products.filter((product) => product.discount);

  const displayedProducts = useMemo(() => {

    const source = view === "discounts" ? discounts : filteredProducts;

    return source.filter((product) => {

      const query = search.trim().toLowerCase();

      return !query || [product.name, product.category, product.description].some((value) => value?.toLowerCase().includes(query));

    });

  }, [discounts, filteredProducts, search, view]);

  const inventoryValue = products.reduce((total, product) => total + product.price * product.stock, 0);



  const formProduct = editing && editing !== "new" ? {

    ...editing,

    discountType: editing.discount?.type || "",

    discountValue: editing.discount?.value || "",

  } : null;



  const saveProduct = (product) => {

    setProducts((current) => {

      const exists = current.some((item) => item.id === product.id);

      return exists ? current.map((item) => item.id === product.id ? product : item) : [product, ...current];

    });

    setEditing(null);

    setView("products");

  };



  const deleteProduct = async (id) => {

    if (!window.confirm("Remove this product from your store?")) return;

    try {

      await authenticatedRequest(`/api/products/${id}`, { method: "DELETE" });

      setProducts((current) => current.filter((product) => product.id !== id));

    } catch (requestError) {

      setError(requestError.message);

    }

  };



  const logout = async () => {

    await apiRequest("/api/auth/logout", { method: "POST" }).catch(() => {});

    navigate("/signin", { replace: true });

  };



  const saveProfile = (updatedUser) => {

    setUser(updatedUser);

    setProfileOpen(false);

  };



  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#FAFAF7] text-[#6B6B66]">Loading your store...</main>;

  if (!user) return null;



  return (

    <main className="min-h-screen bg-[#F5F2ED] font-sans text-[#26231F]">

      <div className="flex min-h-screen min-w-0">

        {sidebarOpen && <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-[#26231F]/25 md:hidden" />}

        <aside className={`sidebar-scroll fixed inset-y-0 left-0 z-40 flex h-dvh w-72 max-w-[calc(100vw-1rem)] shrink-0 flex-col overflow-y-auto border-r border-[#E5DED5] bg-[#F2EEE8] p-4 shadow-2xl transition-transform duration-300 sm:p-5 md:sticky md:top-0 md:z-auto md:h-screen md:max-h-screen md:shadow-none md:transition-[width,padding] ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} ${sidebarCollapsed ? "md:w-[84px] md:px-3" : "md:w-64"}`}>

          <div className={`flex items-center ${sidebarCollapsed ? "md:justify-center" : "justify-between"}`}>

            <Link to="/dashboard" className={`text-xl font-semibold tracking-tight text-[#26231F] ${sidebarCollapsed ? "md:hidden" : ""}`}>Inventra<span className="text-[#7653A8]">.</span></Link>

            <button onClick={() => { setSidebarOpen(false); setSidebarCollapsed((collapsed) => !collapsed); }} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} className="rounded-lg p-2 text-[#817A70] transition hover:bg-white/70 hover:text-[#7653A8]">{sidebarCollapsed ? "»" : "«"}</button>

          </div>

          <p className="mt-1 truncate text-xs text-[#817A70]">{user.store?.name || "My store"}</p>

          <nav className="mt-9 grid gap-1">

            {[["overview", "Overview"], ["products", "My products"], ["discounts", "Discounts"]].map(([key, label]) => (

              <button key={key} title={label} onClick={() => { setView(key); if (key !== "products") setEditing(null); setSidebarOpen(false); }} className={`rounded-lg px-3 py-2.5 text-left text-sm font-medium transition duration-200 hover:translate-x-1 ${view === key ? "bg-white text-[#7653A8] shadow-sm" : "text-[#625C53] hover:bg-white/60"} ${sidebarCollapsed ? "md:text-center" : ""}`}><span className={sidebarCollapsed ? "" : "mr-2 text-xs"}>{key === "overview" ? "◈" : key === "products" ? "▦" : "◇"}</span><span className={sidebarCollapsed ? "md:hidden" : ""}>{label}</span></button>

            ))}

          </nav>

          <div className={`mt-8 border-t border-[#DDD5CC] pt-5 ${sidebarCollapsed ? "md:mt-auto md:border-0 md:pt-0" : ""}`}>

            <p className={`px-3 text-[11px] font-semibold uppercase tracking-wide text-[#9A9288] ${sidebarCollapsed ? "md:hidden" : ""}`}>Product categories</p>

            <div className="mt-2 grid gap-1">

              <button title="All products" onClick={() => { setActiveCategory("All products"); setView("products"); setSidebarOpen(false); }} className={`rounded-lg px-3 py-2 text-left text-sm ${activeCategory === "All products" && view === "products" ? "bg-white font-medium text-[#7653A8] shadow-sm" : "text-[#625C53] hover:bg-white/60"} ${sidebarCollapsed ? "md:px-0 md:text-center" : ""}`}><span className={sidebarCollapsed ? "md:inline" : "md:hidden"}>•</span><span className={sidebarCollapsed ? "md:hidden" : ""}>All products</span></button>

              {CATEGORIES.slice(1).map((category) => <button key={category} title={category} onClick={() => { setActiveCategory(category); setView("products"); setSidebarOpen(false); }} className={`rounded-lg px-3 py-2 text-left text-sm ${activeCategory === category && view === "products" ? "bg-white font-medium text-[#7653A8] shadow-sm" : "text-[#625C53] hover:bg-white/60"} ${sidebarCollapsed ? "md:px-0 md:text-center" : ""}`}><span className={sidebarCollapsed ? "md:inline" : "md:hidden"}>•</span><span className={sidebarCollapsed ? "md:hidden" : ""}>{category}</span></button>)}

            </div>

          </div>

          <div className={`mt-auto border-t border-[#DDD5CC] pt-4 ${sidebarCollapsed ? "md:border-0 md:pt-0" : ""}`}>

            <button onClick={() => setProfileOpen(true)} title="Open profile settings" className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/70 ${sidebarCollapsed ? "md:justify-center" : ""}`}>

              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E9E2FA] font-semibold text-[#7653A8]">{user.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : (user.name || "S").slice(0, 1).toUpperCase()}</div>

              <div className={sidebarCollapsed ? "md:hidden" : "min-w-0"}><p className="truncate text-sm font-semibold">{user.name || user.username}</p><p className="truncate text-xs text-[#817A70]">Edit profile</p></div>

            </button>

            <button onClick={logout} className={`mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-[#817A70] transition hover:bg-white/70 hover:text-[#B65B50] ${sidebarCollapsed ? "md:hidden" : ""}`}>Sign out</button>

          </div>

        </aside>



        <section className="min-w-0 flex-1">

          <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-[#E5DED5] bg-[#FBFAF8] px-4 py-3 sm:flex-row sm:px-8">

            <button onClick={() => setSidebarOpen(true)} aria-label="Open navigation" className="rounded-lg p-2 text-xl text-[#625C53] transition hover:bg-[#EEEAE4] hover:text-[#7653A8] md:hidden">☰</button>

            <label className="order-2 flex h-10 min-w-0 basis-full items-center gap-2 rounded-xl border border-[#E5DED5] bg-white px-3 text-sm text-[#9A9288] shadow-sm sm:order-none sm:max-w-md sm:flex-1 sm:basis-auto">

              <span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search products" placeholder="Search products, categories..." className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#A29A90]" />

            </label>

            <div className="ml-auto flex items-center gap-2 sm:gap-3"><button onClick={() => setProfileOpen(true)} aria-label="Open profile settings" className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E9E2FA] font-semibold text-[#7653A8] transition hover:scale-105 hover:shadow-md sm:hidden">{user.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : (user.name || "S").slice(0, 1).toUpperCase()}</button><span className="hidden max-w-32 truncate text-sm text-[#817A70] sm:block">{user.name || user.username}</span><button onClick={() => setEditing("new")} className="h-10 whitespace-nowrap rounded-lg bg-[#26231F] px-3 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-[#4A4540] hover:shadow-lg active:translate-y-0 sm:px-4">+ Add product</button></div>

          </header>

          <nav className="flex gap-2 overflow-x-auto border-b border-[#E7E6E0] bg-white px-4 py-3 md:hidden">

            {[["overview", "Overview"], ["products", "Products"], ["discounts", "Discounts"]].map(([key, label]) => (

              <button key={key} onClick={() => { setView(key); if (key !== "products") setEditing(null); }} className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${view === key ? "bg-[#F1F6F4] text-[#2F6F62]" : "text-[#6B6B66]"}`}>{label}</button>

            ))}

            <select value={activeCategory} onChange={(event) => { setActiveCategory(event.target.value); setView("products"); }} className="rounded-md border border-[#E7E6E0] bg-white px-2 text-sm text-[#6B6B66]">

              {CATEGORIES.map((category) => <option key={category}>{category}</option>)}

            </select>

          </nav>

          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">

            {error && <p role="alert" className="mb-5 rounded-md bg-[#FDF0EE] px-3 py-2 text-sm text-[#B4443A]">{error}</p>}

            {editing && <ProductForm initial={formProduct} onCancel={() => setEditing(null)} onSaved={saveProduct} />}

            {!editing && view === "overview" && (

              <>

                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7653A8]">Store overview</p>

                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#26231F] sm:text-4xl">{timeGreeting}, {user.name || user.username}</h1>

                <p className="mt-2 text-[#817A70]">Your inventory, offers, and store performance at a glance.</p>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                  {[["Total products", products.length, "▦"], ["Active discounts", discounts.length, "◇"], ["Stock value", money(inventoryValue), "₹"], ["Low stock items", products.filter((product) => product.stock <= 5).length, "!"]].map(([label, value, icon]) => <div key={label} className="rounded-xl border border-[#E4DED5] bg-white p-5"><div className="flex items-center justify-between"><p className="text-sm text-[#817A70]">{label}</p><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3EDFF] text-sm text-[#7653A8]">{icon}</span></div><p className="mt-4 text-2xl font-semibold text-[#26231F]">{value}</p></div>)}

                </div>

                <div className="mt-6 grid min-w-0 grid-cols-1 items-start gap-4">

                  <div className="min-w-0 rounded-2xl border border-[#E4DED5] bg-white p-4 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold text-[#26231F]">Inventory at a glance</h2><p className="mt-1 text-sm text-[#817A70]">Your latest products and stock levels.</p></div><button onClick={() => { setView("products"); setActiveCategory("All products"); }} className="text-sm font-medium text-[#7653A8] hover:text-[#51347D]">View all</button></div><div className="mt-5"><ProductTable products={products.slice(0, 4)} onEdit={setEditing} onDelete={deleteProduct} /></div></div>

                  <div className="min-w-0 w-full rounded-2xl border border-[#DCD0F4] bg-[#E9E2FA] p-5 sm:p-6"><p className="text-sm font-medium text-[#7653A8]">Quick start</p><h2 className="mt-3 text-lg font-semibold text-[#26231F]">Keep your catalogue fresh.</h2><p className="mt-3 text-sm leading-relaxed text-[#625C53]">Add products with clear prices, quantities, and offers so customers can shop with confidence.</p><button onClick={() => setEditing("new")} className="mt-6 rounded-lg bg-[#26231F] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#4A4540]">Add a product</button></div>

                </div>

              </>

            )}

            {!editing && (view === "products" || view === "discounts") && (

              <>

                <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-[#2F6F62]">{view === "discounts" ? "Offers" : activeCategory}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{view === "discounts" ? "Your discounts" : "Your products"}</h1></div><button onClick={() => setEditing("new")} className="h-11 rounded-md bg-[#2F6F62] px-4 text-sm font-medium text-white">+ Add product</button></div>

                <p className="mt-2 text-[#817A70]">{view === "discounts" ? "Add or remove offers whenever your prices change." : "Manage your products, prices, stock, and offers in one place."}</p>

                <div className="mt-8"><ProductTable products={displayedProducts} onEdit={setEditing} onDelete={deleteProduct} /></div>

              </>

            )}

          </div>

        </section>

      </div>

      {profileOpen && <ProfilePanel user={user} onClose={() => setProfileOpen(false)} onSaved={saveProfile} onLogout={logout} />}

    </main>

  );

}
