import { Suspense } from "react";
import { VendorDetailPageClient } from "@/components/vendors/detail-client";

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center rounded-[28px] border border-[#e6ecf7] bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1f3d8f] border-t-transparent" />
        </div>
      }
    >
      <VendorDetailPageClient vendorId={id} />
    </Suspense>
  );
}
