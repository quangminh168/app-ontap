'use client';

export default function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: { v: string; t: string }[];
}) {
  return (
    <label className="fsel">
      <span className="lab">{label}</span>
      <select name={name} defaultValue={value} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.t}</option>
        ))}
      </select>
    </label>
  );
}
