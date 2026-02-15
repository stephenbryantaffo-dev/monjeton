import { useRef } from "react";
import { motion } from "framer-motion";
import { Camera, Upload, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScanUploadAreaProps {
  scanType: "receipt" | "screenshot";
  onFileSelected: (file: File) => void;
}

const ScanUploadArea = ({ scanType, onFileSelected }: ScanUploadAreaProps) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFileSelected(f);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card rounded-2xl p-8 flex flex-col items-center gap-5"
    >
      <div className="w-20 h-20 rounded-full glass flex items-center justify-center">
        {scanType === "receipt" ? (
          <Camera className="w-8 h-8 text-primary" />
        ) : (
          <ImageIcon className="w-8 h-8 text-primary" />
        )}
      </div>

      <div className="text-center space-y-1">
        <h3 className="text-foreground font-semibold">
          {scanType === "receipt" ? "Scanner une facture" : "Importer une capture"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {scanType === "receipt"
            ? "Prenez en photo ou importez votre ticket de caisse (image ou PDF)"
            : "Uploadez votre capture d'écran Mobile Money (Wave, Orange, MTN, Moov)"}
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={scanType === "receipt" ? "image/*,application/pdf" : "image/*"}
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />

      <div className="flex gap-3">
        <Button
          onClick={() => fileRef.current?.click()}
          className="gradient-primary text-primary-foreground"
        >
          <Camera className="w-4 h-4 mr-2" /> Photo
        </Button>
        <Button
          variant="outline"
          className="glass"
          onClick={() => {
            if (fileRef.current) {
              fileRef.current.removeAttribute("capture");
              fileRef.current.click();
              fileRef.current.setAttribute("capture", "environment");
            }
          }}
        >
          <Upload className="w-4 h-4 mr-2" /> Galerie
        </Button>
      </div>

      <div className="glass rounded-xl p-3 w-full">
        <p className="text-xs text-muted-foreground text-center">
          💡 Conseil : prenez la photo bien à plat et bien éclairée pour de meilleurs résultats
        </p>
      </div>
    </motion.div>
  );
};

export default ScanUploadArea;
