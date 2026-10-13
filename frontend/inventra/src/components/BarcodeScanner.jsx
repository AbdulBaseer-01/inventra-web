import { useEffect, useRef, useState } from "react";

const BARCODE_RE = /^\d{8,14}$/;

export default function BarcodeScanner({ value = "", onChange, onProductFound }) {
  const inputRef = useRef(null);
  const [barcode, setBarcode] = useState(value);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const updateBarcode = (nextValue) => {
    const next = nextValue.replace(/\D/g, "").slice(0, 14);
    setBarcode(next);
    onChange?.(next);
  };

  async function handleScan(event) {
    if (event.key !== "Enter") return;

    event.preventDefault();
    const code = barcode.trim();

    if (!BARCODE_RE.test(code)) {
      setMessageType("error");
      setMessage("Scan a valid 8–14 digit product barcode.");
      return;
    }

    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(code)}?fields=code,product_name,brands,image_front_url,categories,quantity`,
        { headers: { Accept: "application/json" } }
      );

      if (!response.ok) throw new Error("Product lookup failed. Try again.");

      const result = await response.json();
      if (result.status !== 1 || !result.product) {
        onProductFound?.({ barcode: code });
        setMessageType("info");
        setMessage("Barcode saved, but no catalogue match was found. Enter the product details manually.");
        return;
      }

      const product = result.product;
      onProductFound?.({
        barcode: code,
        name: product.product_name || "",
        brand: product.brands || "",
        imageUrl: product.image_front_url || "",
        category: product.categories?.split(",")[0]?.trim() || "",
        quantity: product.quantity || "",
      });
      setMessageType("success");
      setMessage("Product found. Review the details before saving.");
    } catch (error) {
      onProductFound?.({ barcode: code });
      setMessageType("error");
      setMessage(error.message || "Unable to look up product. You can still enter the details manually.");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="rounded-lg border border-[#DCD0F4] bg-[#FAF8FF] p-4 sm:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[#26231F]">Scan product barcode</h3>
          <p className="mt-1 text-sm text-[#6B6B66]">
            Click the field, then scan with your USB barcode scanner. It behaves like a keyboard and should send Enter automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.focus()}
          disabled={loading}
          className="rounded-md border border-[#DCD0F4] bg-white px-3 py-2 text-sm font-medium text-[#7653A8] disabled:opacity-60"
        >
          {loading ? "Looking up..." : "Focus scanner"}
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          ref={inputRef}
          value={barcode}
          onChange={(event) => updateBarcode(event.target.value)}
          onKeyDown={handleScan}
          inputMode="numeric"
          autoComplete="off"
          placeholder="Click here and scan barcode"
          disabled={loading}
          className="h-11 min-w-0 flex-1 rounded-md border border-[#E7E6E0] bg-white px-3 text-[#26231F] outline-none focus:border-[#7653A8] focus:ring-4 focus:ring-[#E9E2FA]"
        />
        <button
          type="button"
          onClick={() => handleScan({ key: "Enter", preventDefault() {} })}
          disabled={loading || !barcode}
          className="h-11 rounded-md bg-[#7653A8] px-4 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "Looking up..." : "Look up"}
        </button>
      </div>
      {message && (
        <p
          role="status"
          className={`mt-2 text-sm ${messageType === "error" ? "text-[#B5473C]" : messageType === "success" ? "text-[#2F6F62]" : "text-[#625C53]"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
