// src/pages/team/components/BranchPicker.jsx
// Branch chips with an inline "Add branch…" field (the design's branch selector). Picks from the loaded branches only.
import { useId, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function BranchPicker({ branches, selectedIds, onToggle, tone = "neutral", id }) {
  const auto = useId();
  const inputId = id || auto;
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const selected = branches.filter((b) => selectedIds.includes(b._id));
  const matches = useMemo(
    () => branches.filter((b) => !selectedIds.includes(b._id) && b.name.toLowerCase().includes(query.trim().toLowerCase())),
    [branches, selectedIds, query]
  );
  const add = (b) => {
    onToggle(b._id);
    setQuery("");
  };

  return (
    <div className="relative">
      <div className="flex min-h-control flex-wrap items-center gap-1.5 rounded-control border border-line-input bg-surface px-2 py-1.5">
        {selected.map((b) => (
          <Badge key={b._id} variant={tone} className="h-7 gap-1.5">
            {b.name}
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${b.name}`} onClick={() => onToggle(b._id)} className="!h-4 !w-4 min-w-0 rounded-full p-0 text-current hover:bg-transparent">
              <X className="size-3.5" />
            </Button>
          </Badge>
        ))}
        <Input
          id={inputId}
          value={query}
          placeholder="Add branch…"
          autoComplete="off"
          className="h-7 min-w-[120px] flex-1 border-0 bg-transparent p-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (matches[0]) add(matches[0]);
            }
          }}
        />
      </div>
      {focused && matches.length > 0 ? (
        <ul role="listbox" className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-control border border-line-card bg-surface p-1 shadow-md">
          {matches.map((b) => (
            <li key={b._id} role="option" aria-selected="false">
              <Button type="button" variant="ghost" className="!h-auto w-full justify-start px-3 py-2 text-small font-normal text-ink-1" onMouseDown={(e) => e.preventDefault()} onClick={() => add(b)}>
                {b.name}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
