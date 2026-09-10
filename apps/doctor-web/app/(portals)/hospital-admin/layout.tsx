import React from "react";

// Hospital Admin pages are served within the parent (portals)/layout.tsx shell.
// This sub-layout simply passes through children.
export default function HospitalAdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
