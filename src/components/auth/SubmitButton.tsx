import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export interface SubmitButtonProps {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  type?: "submit" | "button";
}

export function SubmitButton({ loading, children, className, onClick, type = "submit" }: SubmitButtonProps) {
  return (
    <Button type={type} className={className ?? "w-full"} disabled={loading} onClick={onClick}>
      {loading && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}
