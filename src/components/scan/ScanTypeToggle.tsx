interface ScanTypeToggleProps {
  scanType: "receipt" | "screenshot";
  onChangeScanType: (type: "receipt" | "screenshot") => void;
}

const ScanTypeToggle = ({ scanType, onChangeScanType }: ScanTypeToggleProps) => (
  <div className="flex gap-2 mb-4">
    <button
      onClick={() => onChangeScanType("receipt")}
      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        scanType === "receipt" ? "bg-primary text-primary-foreground" : "glass text-muted-foreground"
      }`}
    >
      🧾 Scanner une facture
    </button>
    <button
      onClick={() => onChangeScanType("screenshot")}
      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        scanType === "screenshot" ? "bg-primary text-primary-foreground" : "glass text-muted-foreground"
      }`}
    >
      📱 Capture Mobile Money
    </button>
  </div>
);

export default ScanTypeToggle;
