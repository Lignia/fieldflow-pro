export default function Clients() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">Gérez vos clients et prospects</p>
        </div>
      </div>
      <div className="flex items-center justify-center h-64 rounded-lg border border-dashed bg-muted/30">
        <p className="text-muted-foreground text-sm">Liste clients — à venir</p>
      </div>
    </div>
  );
}
