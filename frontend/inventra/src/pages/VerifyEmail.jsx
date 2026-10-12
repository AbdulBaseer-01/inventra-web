import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../lib/api.js";

export default function VerifyEmail() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, message: "" });

  useEffect(() => {
    let active = true;

    apiRequest(`/api/auth/verify-email/${encodeURIComponent(token)}`)
      .then((data) => {
        if (active) setState({ loading: false, message: data.message });
      })
      .catch((error) => {
        if (active) setState({ loading: false, message: error.message });
      });

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAFAF7] px-5 font-sans text-[#111111]">
      <section className="w-full max-w-md rounded-lg border border-[#E7E6E0] bg-white p-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          {state.loading ? "Verifying your email..." : state.message}
        </h1>
        {!state.loading && (
          <Link
            to="/signin"
            className="mt-6 inline-flex h-11 items-center rounded-md bg-[#2F6F62] px-5 text-sm font-medium text-white hover:bg-[#275c52]"
          >
            Continue to sign in
          </Link>
        )}
      </section>
    </main>
  );
}
