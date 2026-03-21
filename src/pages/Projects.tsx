export default function Projects() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ lineHeight: "1.1" }}>Projets</h1>
        <p className="text-sm text-muted-foreground mt-1">Pipeline de vos projets d'installation</p>
      </div>
      <div className="flex items-center justify-center h-64 rounded-lg border border-dashed bg-muted/30">
        <p className="text-muted-foreground text-sm">Pipeline projets — à venir</p>
      </div>
    </div>
  );
}
