import { AlertTriangle } from "lucide-react";
import { ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DeleteConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  subject?: string | null;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  loadingText?: string;
  onConfirm: () => void;
  preview?: ReactNode;
  warning?: ReactNode;
  className?: string;
};

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  subject,
  confirmLabel = "Yes, Delete!",
  cancelLabel = "No, keep it.",
  loading = false,
  loadingText = "Deleting...",
  onConfirm,
  preview,
  warning,
  className,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={cn(
          "max-w-[620px] overflow-hidden rounded-[32px] border border-[#FFD7D2] bg-white p-0 shadow-[0_28px_90px_rgba(255,59,48,0.18)] dark:border-[#5B201A] dark:bg-[#140E0E]",
          className,
        )}
      >
        <div className="bg-gradient-to-b from-[#FFF8F7] via-white to-white px-8 pt-9 text-center dark:from-[#1C1212] dark:via-[#140E0E] dark:to-[#140E0E]">
          <div className="mx-auto flex h-[84px] w-[84px] items-center justify-center rounded-full border border-[#FFD7D2] bg-[#FFF1EF] shadow-[0_12px_32px_rgba(255,59,48,0.12)] dark:border-[#5B201A] dark:bg-[#291716]">
            <AlertTriangle className="h-11 w-11 text-[#FF3B30]" strokeWidth={2.2} />
          </div>

          <AlertDialogHeader className="mt-6 space-y-3 text-center">
            <AlertDialogTitle className="text-[2.05rem] font-black tracking-[-0.04em] text-[#212121] dark:text-[#FFF7F6]">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="mx-auto max-w-[460px] text-base leading-7 text-[#4F4F4F] dark:text-[#F5D8D3]">
              {subject ? (
                <>
                  You&apos;re going to delete your <span className="font-semibold text-[#212121] dark:text-white">&ldquo;{subject}&rdquo;</span>.
                  <span className="block pt-2 text-[15px] leading-6 text-[#666666] dark:text-[#E7BBB4]">{description}</span>
                </>
              ) : (
                description
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {preview ? <div className="mt-6">{preview}</div> : null}
          {warning ? <div className="mt-4">{warning}</div> : null}
        </div>

        <AlertDialogFooter className="grid grid-cols-1 gap-3 px-8 pb-8 pt-7 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="h-14 rounded-2xl border-[#E9E9EC] bg-[#F4F4F6] text-[15px] font-semibold text-[#3F3F46] shadow-none transition-all hover:border-[#D6D6DB] hover:bg-[#ECECEF] dark:border-[#37343A] dark:bg-[#211F24] dark:text-[#F1EFF4] dark:hover:bg-[#2A282D]"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            loading={loading}
            loadingText={loadingText}
            className="h-14 rounded-2xl border-none bg-[#FF3B30] text-[15px] font-bold text-white shadow-[0_14px_30px_rgba(255,59,48,0.28)] transition-all hover:bg-[#F12D22] dark:bg-[#FF3B30] dark:hover:bg-[#F12D22]"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
