"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { DashboardVendor, VendorVerificationDocument } from "@/lib/vendors-admin";

const refreshIntervalMs = 30_000;

function primaryVendorAction(status: DashboardVendor["status"]): "approve" | "unblock" {
  return status === "BLOCKED" ? "unblock" : "approve";
}

function primaryVendorActionLabel(status: DashboardVendor["status"]) {
  return status === "BLOCKED" ? "Unblock" : "Approve";
}

function vendorInitials(vendor: DashboardVendor) {
  const source = vendor.businessName || vendor.owner || vendor.id;
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "VN";
}

function renderAvatar(vendor: DashboardVendor) {
  if (vendor.avatar) {
    return (
      <Image
        src={vendor.avatar}
        alt={vendor.businessName}
        width={112}
        height={112}
        className="h-28 w-28 rounded-3xl object-cover"
      />
    );
  }

  return (
    <div className="grid h-28 w-28 place-items-center rounded-3xl bg-[#edf2fb] text-[30px] font-semibold text-[#415a91]">
      {vendorInitials(vendor)}
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function statusLabel(value: string) {
  if (!value) return "Pending";
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function sectionEntries(section: Record<string, unknown>) {
  return Object.entries(section).filter(([, value]) => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  });
}

function displayValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(", ");
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return String(value);
}

function isImageDocument(url: string) {
  return /\.(png|jpe?g|webp|gif|bmp|svg)(\?|#|$)/i.test(url);
}

function stars(rating: number) {
  const rounded = Math.max(0, Math.min(5, Math.round(rating)));
  return Array.from({ length: 5 }, (_, index) => (
    <svg
      key={`star-${index}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={index < rounded ? "currentColor" : "none"}
      className={index < rounded ? "text-[#f59e0b]" : "text-[#d7deea]"}
    >
      <path
        d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8-4.3-4.1 5.9-.9L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  ));
}

function DocumentsGrid({ docs }: { docs: VendorVerificationDocument[] }) {
  if (docs.length === 0) {
    return <p className="text-[13px] text-[#8b96ad]">No verification documents uploaded.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {docs.map((doc) => (
        <a
          key={`${doc.title}-${doc.url}`}
          href={doc.url}
          target="_blank"
          rel="noreferrer"
          className="overflow-hidden rounded-3xl border border-[#e6ecf7] bg-white transition hover:border-[#bfd0f7] hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
        >
          <div>
            {isImageDocument(doc.url) ? (
              <div className="bg-[linear-gradient(135deg,#edf5ff,#f8fafc)] p-4">
                <img
                  src={doc.url}
                  alt={doc.title}
                  className="h-52 w-full rounded-2xl border border-[#dde7f5] object-cover"
                />
              </div>
            ) : (
              <div className="grid h-52 place-items-center bg-[linear-gradient(135deg,#edf5ff,#f8fafc)] text-[#6b7b99]">
                <div className="text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <path d="M7 4h7l4 4v12H7V4Z" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M14 4v4h4" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                  </div>
                  <p className="m-0 mt-3 text-[12px] font-semibold">Open document</p>
                  <p className="m-0 mt-1 text-[11px] text-[#8b96ad]">Preview unavailable</p>
                </div>
              </div>
            )}

            <div className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="m-0 text-[13px] font-semibold text-[#1f2d46]">{doc.title}</p>
                <p className="m-0 mt-2 text-[11px] text-[#7b89a3]">
                  {isImageDocument(doc.url) ? "Embedded image preview" : "Tap to open file"}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                  doc.status === "Verified"
                    ? "bg-[#dcfce7] text-[#15803d]"
                    : doc.status === "Rejected"
                      ? "bg-[#fee2e2] text-[#dc2626]"
                      : "bg-[#fff4cc] text-[#b45309]"
                }`}
              >
                {doc.status}
              </span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

async function fetchVendorDetail(id: string, signal?: AbortSignal) {
  const response = await fetch(`/api/vendors/${encodeURIComponent(id)}`, { signal });
  if (!response.ok) {
    throw new Error("Failed to load vendor details");
  }
  const payload = (await response.json()) as { vendor?: DashboardVendor };
  return payload.vendor ?? null;
}

export function VendorDetailPageClient({ vendorId }: { vendorId: string }) {
  const [vendor, setVendor] = useState<DashboardVendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"approve" | "block" | "unblock" | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const loadVendor = async (signal?: AbortSignal) => {
    setError(null);
    try {
      const detail = await fetchVendorDetail(vendorId, signal);
      setVendor(detail);
    } catch (loadError) {
      if ((loadError as { name?: string }).name !== "AbortError") {
        setError("Failed to load live vendor details.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    void loadVendor(controller.signal);

    const intervalId = window.setInterval(() => {
      void loadVendor();
    }, refreshIntervalMs);

    const handleWindowRefresh = () => {
      if (document.visibilityState === "hidden") {
        return;
      }
      void loadVendor();
    };

    window.addEventListener("focus", handleWindowRefresh);
    document.addEventListener("visibilitychange", handleWindowRefresh);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleWindowRefresh);
      document.removeEventListener("visibilitychange", handleWindowRefresh);
    };
  }, [vendorId]);

  const submitAction = async () => {
    if (!pendingAction) {
      return;
    }

    setActionBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/vendors/${encodeURIComponent(vendorId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: pendingAction === "unblock" ? "approve" : pendingAction,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update vendor");
      }

      setPendingAction(null);
      await loadVendor();
    } catch {
      setError("Failed to update vendor status.");
    } finally {
      setActionBusy(false);
    }
  };

  const sections = useMemo(() => {
    if (!vendor) return [];
    return [
      { label: "Profile", values: vendor.sections.profile },
      { label: "Business", values: vendor.sections.business },
      { label: "Verification", values: vendor.sections.verification },
      { label: "Admin Review", values: vendor.sections.adminReview },
    ].filter((section) => sectionEntries(section.values).length > 0);
  }, [vendor]);

  const leftSections = useMemo(
    () => sections.filter((section) => section.label === "Profile" || section.label === "Business"),
    [sections],
  );
  const rightSections = useMemo(
    () => sections.filter((section) => section.label === "Verification" || section.label === "Admin Review"),
    [sections],
  );

  if (loading && !vendor) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1f3d8f] border-t-transparent" />
      </div>
    );
  }

  if (error && !vendor) {
    return (
      <div className="rounded-3xl border border-[#fee2e2] bg-[#fff5f5] p-6 text-[#b91c1c]">
        {error}
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="rounded-3xl border border-[#e6ecf7] bg-white p-6 text-[#60718f]">
        Vendor not found.
      </div>
    );
  }

  return (
    <section className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8b96ad]">
            Vendor management
          </p>
          <h1 className="m-0 mt-2 text-[30px] font-semibold tracking-[-0.03em] text-[#18233c]">
            {vendor.businessName}
          </h1>
          <p className="m-0 mt-2 text-[13px] text-[#60718f]">
            Live vendor detail view with current profile, verification, and uploaded documents.
          </p>
        </div>
        <Link
          href="/vendors"
          className="inline-flex h-10 items-center rounded-xl border border-[#dbe2ef] px-4 text-[13px] font-medium text-[#4e5f83]"
        >
          Cancel
        </Link>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-[#e6ecf7] bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-5">
            {renderAvatar(vendor)}
            <div className="space-y-3">
              <div>
                <h2 className="m-0 text-[24px] font-semibold text-[#1d2a43]">{vendor.businessName}</h2>
                <p className="m-0 mt-1 text-[14px] text-[#60718f]">{vendor.owner}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-[11px] font-semibold text-[#1f3d8f]">
                  {vendor.category}
                </span>
                <span className="rounded-full bg-[#f8fafc] px-3 py-1 text-[11px] font-semibold text-[#64748b]">
                  Vendor ID: {vendor.id}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                    vendor.status === "APPROVED"
                      ? "bg-[#dcfce7] text-[#15803d]"
                      : vendor.status === "BLOCKED" || vendor.status === "REJECTED"
                        ? "bg-[#fee2e2] text-[#dc2626]"
                        : "bg-[#fff4cc] text-[#b45309]"
                  }`}
                >
                  {vendor.status}
                </span>
              </div>
              <div className="grid gap-3 text-[13px] text-[#1f2d46] sm:grid-cols-2">
                <p className="m-0"><span className="font-semibold">Email:</span> {vendor.email || "N/A"}</p>
                <p className="m-0"><span className="font-semibold">Phone:</span> {vendor.phone || "N/A"}</p>
                <p className="m-0 sm:col-span-2"><span className="font-semibold">Address:</span> {vendor.verification.address}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[330px]">
            <div className="rounded-2xl bg-[#f8fafc] p-4">
              <p className="m-0 text-[11px] uppercase tracking-[0.08em] text-[#8b96ad]">Rating</p>
              <div className="mt-2 flex items-end gap-3">
                <span className="text-[32px] leading-none text-[#1d2a43]">{vendor.verification.reviewScore.toFixed(1)}</span>
                <span className="flex items-center gap-1">{stars(vendor.verification.reviewScore)}</span>
              </div>
              <p className="m-0 mt-2 text-[11px] text-[#7b89a3]">
                {vendor.verification.reviewCount.toLocaleString()} verified reviews
              </p>
            </div>
            <div className="rounded-2xl bg-[#f8fafc] p-4">
              <p className="m-0 text-[11px] uppercase tracking-[0.08em] text-[#8b96ad]">Verification</p>
              <p className="m-0 mt-2 text-[16px] font-semibold text-[#1d2a43]">
                {statusLabel(vendor.verification.status)}
              </p>
              <p className="m-0 mt-2 text-[11px] text-[#7b89a3]">
                Created {formatDate(vendor.createdAt)}
              </p>
              <p className="m-0 mt-1 text-[11px] text-[#7b89a3]">
                Updated {formatDate(vendor.updatedAt)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#e6ecf7] bg-white p-5 shadow-[0_10px_32px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="m-0 text-[18px] font-semibold text-[#1d2a43]">Vendor actions</h3>
            <p className="m-0 mt-1 text-[12px] text-[#7b89a3]">Approve, block, or cancel directly from this vendor page.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setPendingAction(primaryVendorAction(vendor.status))}
              disabled={vendor.status === "APPROVED" || actionBusy}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1f3d8f] px-5 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {primaryVendorActionLabel(vendor.status)}
            </button>
            <button
              type="button"
              onClick={() => setPendingAction("block")}
              disabled={vendor.status === "BLOCKED" || actionBusy}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#fecaca] bg-[#fff5f5] px-5 text-[13px] font-semibold text-[#dc2626] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Block
            </button>
            <Link
              href="/vendors"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#dbe2ef] px-5 text-[13px] font-medium text-[#4e5f83]"
            >
              Cancel
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="space-y-6">
          <article className="rounded-[24px] border border-[#e6ecf7] bg-white p-6 shadow-[0_10px_32px_rgba(15,23,42,0.05)]">
            <h3 className="m-0 text-[18px] font-semibold text-[#1d2a43]">Business overview</h3>
            <p className="m-0 mt-3 text-[14px] leading-7 text-[#60718f]">
              {vendor.verification.description}
            </p>
          </article>

          {leftSections.map((section) => (
            <article
              key={section.label}
              className="rounded-[24px] border border-[#e6ecf7] bg-white p-6 shadow-[0_10px_32px_rgba(15,23,42,0.05)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="m-0 text-[18px] font-semibold text-[#1d2a43]">{section.label}</h3>
                  <p className="m-0 mt-1 text-[12px] text-[#7b89a3]">Current live backend values</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {sectionEntries(section.values).map(([key, value]) => (
                  <div
                    key={`${section.label}-${key}`}
                    className="rounded-2xl border border-[#edf2f7] bg-[#f8fafc] px-4 py-3 sm:min-h-[92px]"
                  >
                    <p className="m-0 text-[10px] uppercase tracking-[0.08em] text-[#94a3b8]">
                      {key.replaceAll("_", " ")}
                    </p>
                    <p className="m-0 mt-2 break-words text-[13px] leading-6 text-[#1f2d46]">
                      {displayValue(value)}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}

          <article className="rounded-[24px] border border-[#e6ecf7] bg-white p-6 shadow-[0_10px_32px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="m-0 text-[18px] font-semibold text-[#1d2a43]">Verification documents</h3>
                <p className="m-0 mt-1 text-[13px] text-[#7b89a3]">
                  Live previews from vendor verification records.
                </p>
              </div>
            </div>
            <div className="mt-5">
              <DocumentsGrid docs={vendor.verification.docs} />
            </div>
          </article>

          {vendor.verification.rejectionReason ? (
            <article className="rounded-[24px] border border-[#fee2e2] bg-[#fff5f5] p-6">
              <h3 className="m-0 text-[16px] font-semibold text-[#b91c1c]">Review note</h3>
              <p className="m-0 mt-3 text-[14px] leading-7 text-[#b91c1c]">
                {vendor.verification.rejectionReason}
              </p>
            </article>
          ) : null}
        </div>

        <div className="space-y-6">
          <article className="rounded-[24px] border border-[#e6ecf7] bg-white p-6 shadow-[0_10px_32px_rgba(15,23,42,0.05)]">
            <h3 className="m-0 text-[18px] font-semibold text-[#1d2a43]">Verification status</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl bg-[#f8fafc] p-4">
                <p className="m-0 text-[10px] uppercase tracking-[0.08em] text-[#8b96ad]">Current status</p>
                <p className="m-0 mt-2 text-[18px] font-semibold text-[#1d2a43]">
                  {statusLabel(vendor.verification.status)}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f8fafc] p-4">
                <p className="m-0 text-[10px] uppercase tracking-[0.08em] text-[#8b96ad]">Last sync</p>
                <p className="m-0 mt-2 text-[13px] leading-6 text-[#1f2d46]">{formatDate(vendor.updatedAt)}</p>
              </div>
            </div>
          </article>

          {rightSections.map((section) => (
            <article
              key={section.label}
              className="rounded-[24px] border border-[#e6ecf7] bg-white p-6 shadow-[0_10px_32px_rgba(15,23,42,0.05)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="m-0 text-[18px] font-semibold text-[#1d2a43]">{section.label}</h3>
                  <p className="m-0 mt-1 text-[12px] text-[#7b89a3]">Live review and verification metadata</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                {sectionEntries(section.values).map(([key, value]) => (
                  <div key={`${section.label}-${key}`} className="rounded-2xl bg-[#f8fafc] px-4 py-3">
                    <p className="m-0 text-[10px] uppercase tracking-[0.08em] text-[#94a3b8]">
                      {key.replaceAll("_", " ")}
                    </p>
                    <p className="m-0 mt-2 break-words text-[13px] leading-6 text-[#1f2d46]">
                      {displayValue(value)}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {pendingAction ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0f172a]/45 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.25)]">
            <h3 className="m-0 text-[18px] font-semibold text-[#1d2a43]">
              Confirm {pendingAction === "block" ? "Block" : pendingAction === "unblock" ? "Unblock" : "Approval"}
            </h3>
            <p className="m-0 mt-3 text-[13px] leading-6 text-[#60718f]">
              {pendingAction === "approve"
                ? `Approve ${vendor.businessName}? This vendor will be allowed to operate on the platform.`
                : pendingAction === "unblock"
                  ? `Unblock ${vendor.businessName}? This vendor will regain access to operate on the platform.`
                  : `Block ${vendor.businessName}? This vendor will lose access to operate on the platform.`}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                disabled={actionBusy}
                className="inline-flex h-10 items-center rounded-xl border border-[#dbe2ef] px-4 text-[13px] font-medium text-[#4e5f83] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitAction}
                disabled={actionBusy}
                className={`inline-flex h-10 items-center rounded-xl px-4 text-[13px] font-semibold text-white disabled:opacity-50 ${
                  pendingAction === "block" ? "bg-[#dc2626]" : "bg-[#1f3d8f]"
                }`}
              >
                {actionBusy ? "Saving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
