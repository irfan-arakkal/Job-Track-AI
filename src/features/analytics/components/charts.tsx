"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";

/*
 * Single-series charts (one measure each), so one colour (--chart-1) and no legend — the card
 * title names the series. Thin bars (≤ 24px) with a 4px rounded data end, recessive grid and
 * axes, values in text colour (never the bar colour), and a hover tooltip on every bar.
 */

const axisTick = { fill: "var(--muted-foreground)", fontSize: 12 };

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: TooltipContentProps<number, string> & { unit: string }) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0].value);
  return (
    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">
        {value} {value === 1 ? unit : `${unit}s`}
      </p>
    </div>
  );
}

export function MonthlyColumnChart({ data }: { data: { label: string; count: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            allowDecimals={false}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={(props) => (
              <ChartTooltip
                {...(props as TooltipContentProps<number, string>)}
                unit="application"
              />
            )}
          />
          <Bar
            dataKey="count"
            fill="var(--chart-1)"
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="count"
              position="top"
              fill="var(--foreground)"
              fontSize={12}
              formatter={(v) => (Number(v) > 0 ? v : "")}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HorizontalBarChart({ data }: { data: { name: string; count: number }[] }) {
  const height = Math.max(120, data.length * 36 + 16);
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis type="number" allowDecimals={false} hide />
          <YAxis
            type="category"
            dataKey="name"
            width={128}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: string) =>
              value.length > 16 ? `${value.slice(0, 15)}…` : value
            }
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={(props) => (
              <ChartTooltip
                {...(props as TooltipContentProps<number, string>)}
                unit="application"
              />
            )}
          />
          <Bar
            dataKey="count"
            fill="var(--chart-1)"
            maxBarSize={20}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          >
            <LabelList dataKey="count" position="right" fill="var(--foreground)" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
