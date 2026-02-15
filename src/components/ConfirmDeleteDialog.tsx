import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

interface ConfirmDeleteDialogProps {
  onConfirm: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

const ConfirmDeleteDialog = ({
  onConfirm,
  title = "Confirmer la suppression",
  description = "Cette action est irréversible. Voulez-vous continuer ?",
  children,
}: ConfirmDeleteDialogProps) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      {children || (
        <button className="text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </AlertDialogTrigger>
    <AlertDialogContent className="glass-card border-border">
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Annuler</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
          Supprimer
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default ConfirmDeleteDialog;
