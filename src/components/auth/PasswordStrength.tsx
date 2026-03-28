import { cn } from "@/lib/utils";

function getStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: "" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "Faible" };
  if (score <= 2) return { score: 2, label: "Moyen" };
  if (score <= 3) return { score: 3, label: "Bon" };
  return { score: 4, label: "Fort" };
}

const COLORS: Record<number, string> = {
  1: "bg-destructive",
  2: "bg-warning",
  3: "bg-info",
  4: "bg-success",
};

export function PasswordStrength({ password }: { password: string }) {
  const { score, label } = getStrength(password);
  if (!password) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= score ? COLORS[score] : "bg-muted"
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
