import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SubmitButtonProps {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
}

export function SubmitButton({ loading, children, className }: SubmitButtonProps) {
  return (
    <Button type="submit" className={className ?? "w-full"} disabled={loading}>
      {loading && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}
