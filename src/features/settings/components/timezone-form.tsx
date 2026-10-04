"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSyncExternalStore, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { updateTimeZoneAction } from "@/features/settings/actions";

export function TimeZoneForm({ current, zones }: { current: string; zones: string[] }) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [isPending, startTransition] = useTransition();
  // The device's zone only exists in the browser. useSyncExternalStore returns null during
  // server rendering and the real value after hydration, avoiding a hydration mismatch.
  const detected = useSyncExternalStore(
    () => () => {},
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => null,
  );

  function save(timezone: string) {
    startTransition(async () => {
      const result = await updateTimeZoneAction({ timezone });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setValue(timezone);
      toast.success("Time zone saved.");
      router.refresh();
    });
  }

  return (
    <form
      className="grid gap-3 sm:max-w-md"
      onSubmit={(event) => {
        event.preventDefault();
        save(value);
      }}
    >
      <Label htmlFor="timezone">Time zone</Label>
      <NativeSelect id="timezone" value={value} onChange={(event) => setValue(event.target.value)}>
        {zones.map((zone) => (
          <option key={zone} value={zone}>
            {zone.replace(/_/g, " ")}
          </option>
        ))}
      </NativeSelect>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isPending || value === current}>
          {isPending ? <Loader2 className="animate-spin" /> : null}
          Save
        </Button>
        {detected && detected !== current ? (
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => save(detected)}
          >
            Use my device&apos;s zone ({detected})
          </Button>
        ) : null}
      </div>
      <p className="text-muted-foreground text-sm">Used to show and enter interview times.</p>
    </form>
  );
}
