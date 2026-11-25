// src/pages/dashboard/components/PunchHero.jsx
// The dark "today" card of the mobile home screens (labour, staff, supervisor, subcontractor): the clock and the punch
// action when off shift, "Time on site" and Punch out when on shift. Shared by the labour and supervisor homes.
import { CircleCheck, Fingerprint, LogOut, MapPin, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const clock = (d) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
const shortDay = (d) => `${d.toLocaleDateString("en-GB", { weekday: "short" })}, ${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "short" })}`;

export default function PunchHero({ now, punch, todayIn, elapsedMin, sites, onPunch, noSiteHint }) {
  const onShift = punch.punchedIn && !punch.punchedOut;
  const noSite = !sites.length && noSiteHint;
  return (
      <section className="flex flex-col gap-3.5 rounded-[18px] bg-primary p-[18px] text-primary-foreground">
        {onShift ? (
          <>
            <div className="flex items-center justify-between">
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-tone-ok-fg/25 px-2.5 text-caption font-semibold">
                <span className="size-1.5 rounded-full bg-tone-ok-fg" /> On shift
              </span>
              <span className="text-[13px] opacity-75">{shortDay(now)}</span>
            </div>
            {elapsedMin !== null ? (
              <div>
                <div className="text-[13px] opacity-75">Time on site</div>
                <div className="text-[40px] font-semibold leading-[1.1] tracking-tight tabular-nums">
                  {Math.floor(elapsedMin / 60)}h {String(elapsedMin % 60).padStart(2, "0")}m
                </div>
              </div>
            ) : null}
            <div className="flex items-center gap-2.5 rounded-xl bg-primary-foreground/10 p-2.5">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary-foreground/20">
                <UserCheck className="size-5" />
              </span>
              <div className="flex-1 text-[13.5px]">
                <div className="font-semibold">{todayIn ? `Punched in ${clock(new Date(todayIn.createdAt))}` : "You are punched in"}</div>
                <div className="opacity-75">{sites[0] || "Your site"} · selfie verified</div>
              </div>
            </div>
            <Button size="xl" className="w-full bg-surface text-primary hover:bg-surface/90" onClick={onPunch}>
              <LogOut /> Punch out
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[13px] opacity-75">{shortDay(now)}</div>
                <div className="text-[34px] font-semibold leading-[1.1] tracking-tight tabular-nums">{clock(now)}</div>
              </div>
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-primary-foreground/15 px-2.5 text-caption font-semibold">
                <span className="size-1.5 rounded-full bg-highlight" /> {punch.punchedOut ? "Shift complete" : "Not punched in"}
              </span>
            </div>
            {sites.length || noSiteHint ? (
              <div className="flex items-center gap-2 text-[13.5px] opacity-90">
                <MapPin className="size-4 shrink-0" /> <span className="truncate">{sites.length ? sites.join(" · ") : "No site assigned yet"}</span>
              </div>
            ) : null}
            <Button
              size="xl"
              className="w-full bg-highlight text-ink-1 hover:bg-highlight/90"
              disabled={punch.punchedOut}
              onClick={onPunch}
            >
              {punch.punchedOut ? <CircleCheck /> : <Fingerprint />}
              {punch.punchedOut ? "Attendance complete for today" : "Punch in with selfie"}
            </Button>
            <div className="text-center text-[12.5px] opacity-75">{punch.punchedOut ? "See you tomorrow" : noSite ? noSiteHint : "Shift starts when you punch in"}</div>
          </>
        )}
      </section>
  );
}
