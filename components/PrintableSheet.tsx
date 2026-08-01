import type { ReactNode, Ref } from "react";
import HospitalFooter from "@/components/HospitalFooter";

interface PrintableSheetProps {
  ref?: Ref<HTMLDivElement>;
  header: ReactNode;
  children: ReactNode;
}

export default function PrintableSheet({ ref, header, children }: PrintableSheetProps) {
  return (
    <div ref={ref} className="print-only printable-sheet">
      <div className="printable-sheet-header">{header}</div>
      <div className="printable-sheet-content">{children}</div>
      <div className="printable-sheet-footer">
        <HospitalFooter />
      </div>
    </div>
  );
}
