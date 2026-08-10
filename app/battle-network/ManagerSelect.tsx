type Manager = { name: string; initials: string };

export function ManagerSelect({ value, onChange, managers, className = "" }: { value: string; onChange: (value: string) => void; managers: Manager[]; className?: string }) {
  const options = managers.filter((manager) => manager.name.trim() || manager.initials.trim());
  return <select required value={value} onChange={(event) => onChange(event.target.value)} className={className}><option value="">SELECT MANAGER</option>{options.map((manager, index) => <option key={`${manager.initials}-${index}`} value={manager.initials}>{manager.initials}{manager.name ? ` — ${manager.name}` : ""}</option>)}</select>;
}
