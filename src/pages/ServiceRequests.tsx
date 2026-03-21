export default function ServiceRequests() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>Demandes SAV</h1>
        <p className="text-sm text-muted-foreground mt-1">Ramonages, réparations et diagnostics</p>
      </div>
      <div className="flex items-center justify-center h-64 rounded-lg border border-dashed bg-muted/30">
        <p className="text-muted-foreground text-sm">Liste demandes SAV — à venir</p>
      </div>
    </div>
  );
}
