// src/pages/dev/ErrorTest.jsx  (dev only: /styleguide/errors, registered only when import.meta.env.DEV)
// Lets you trigger every failure the error recovery system handles and check that it recovers:
//  1. a render error inside a small section (only that section is replaced)
//  2. a render error outside any local boundary (the route boundary shows the full-page recovery screen)
//  3. a lazy page whose code fails to load the first time and works on "Try again"
//  4. a lazy page that always fails to load (Try again keeps failing, Reload application becomes the main action)
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { SectionCard } from "@/components/common/SectionCard";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

const Bomb = ({ label }) => {
  throw new Error(`Test render error: ${label}`);
};

let attempts = 0;
const FlakyPage = lazyWithRetry(() => {
  attempts += 1;
  if (attempts < 2) return Promise.reject(new Error("Failed to fetch dynamically imported module: /assets/js/flaky.js"));
  return Promise.resolve({ default: () => <p className="text-body text-tone-ok-fg">The lazy page loaded on the second attempt.</p> });
});

const BrokenPage = lazyWithRetry(() => Promise.reject(new Error("Failed to fetch dynamically imported module: /assets/js/broken.js")));

export default function ErrorTest() {
  const [sectionCrash, setSectionCrash] = useState(false);
  const [pageCrash, setPageCrash] = useState(false);
  const [showFlaky, setShowFlaky] = useState(false);
  const [showBroken, setShowBroken] = useState(false);

  if (pageCrash) return <Bomb label="page" />;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-[20px] font-semibold text-ink-1">Error recovery test page</h1>

      <SectionCard title="1. Crash a section" description="Only the box below is replaced; this page stays usable.">
        <ErrorBoundary scope="test-section" onReset={() => setSectionCrash(false)}>
          {sectionCrash ? <Bomb label="section" /> : <p className="text-body text-ink-3">This section works.</p>}
        </ErrorBoundary>
        <Button className="mt-3" variant="outline" onClick={() => setSectionCrash(true)}>
          Crash this section
        </Button>
      </SectionCard>

      <SectionCard title="2. Crash the whole page" description="Shows the full-page recovery screen. Try again re-renders; leaving the route clears it.">
        <Button variant="destructive" onClick={() => setPageCrash(true)}>
          Crash the page
        </Button>
      </SectionCard>

      <SectionCard title="3. Lazy page that fails once" description="The first import fails; Try again imports it again and it loads.">
        <ErrorBoundary scope="test-lazy" onReset={() => {}}>
          {showFlaky ? <FlakyPage /> : null}
        </ErrorBoundary>
        <Button className="mt-3" variant="outline" onClick={() => setShowFlaky(true)}>
          Load the flaky page
        </Button>
      </SectionCard>

      <SectionCard title="4. Lazy page that always fails" description="Try again fails every time; after two failures Reload application is emphasised.">
        <ErrorBoundary scope="test-broken">{showBroken ? <BrokenPage /> : null}</ErrorBoundary>
        <Button className="mt-3" variant="outline" onClick={() => setShowBroken(true)}>
          Load the broken page
        </Button>
      </SectionCard>
    </div>
  );
}
