import React, { useState, useCallback, useRef, useEffect, useLayoutEffect, useId } from "react";
import { Button, Popover } from "antd";
import { AimOutlined, InfoCircleOutlined } from "@ant-design/icons";

/** Number of months visible in the chart viewport; user scrolls to see earlier months */
const MONTHS_VISIBLE = 6;
const Y_AXIS_FIXED_MAX = 100;
const Y_AXIS_INTERVAL = 20;
const CHART_PADDING = { top: 20, right: 40, bottom: 60, left: 60 };
/** Top inset so the point at 100 is not clipped; 0 stays on the x-axis line */
const Y_TOP_INSET = 6;
/** Scroll one month per wheel step; transition for smooth snap */
const PAN_TRANSITION_MS = 220;
const FALLBACK_PIXEL_PER_MONTH = 140;

/** Clamp pan to [panXMax, panXMin] (panXMax is the "show ongoing month" position, often negative) */
function clampPan(pan: number, panXMin: number, panXMax: number): number {
  return Math.max(panXMax, Math.min(panXMin, pan));
}

function snapPanToMonth(panX: number, panXMin: number, panXMax: number, pixelPerMonth: number): number {
  if (pixelPerMonth <= 0) return clampPan(panX, panXMin, panXMax);
  const snapped = Math.round(panX / pixelPerMonth) * pixelPerMonth;
  return clampPan(snapped, panXMin, panXMax);
}

export interface TrendChartDatum {
  name?: string;
  month?: string;
  assigned: number;
  completed: number;
  avgScore: number;
}

interface TrendChartProps {
  trendMonths: TrendChartDatum[];
  height?: number;
  /** Shown in header row next to reset and help */
  title?: string;
}

const TrendChart: React.FC<TrendChartProps> = ({
  trendMonths,
  height = 400,
  title,
}) => {
  const [panX, setPanX] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 800, height });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<SVGSVGElement>(null);
  const clipId = useId().replace(/:/g, "-");
  const defaultPanAppliedForLengthRef = useRef<number | null>(null);
  /** True until we've applied default pan once (so full page refresh always shows ongoing month on right) */
  const needsInitialPanRef = useRef(true);
  const wheelDeltaRef = useRef(0);
  const wheelRafScheduledRef = useRef(false);

  // Measure container (ResizeObserver + initial measure) so size updates when layout changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  const chartWidth = Math.max(
    0,
    containerSize.width - CHART_PADDING.left - CHART_PADDING.right,
  );
  const chartHeight = Math.max(
    0,
    containerSize.height - CHART_PADDING.top - CHART_PADDING.bottom,
  );

  // Exactly MONTHS_VISIBLE months fit in the viewport; scroll to see earlier months. Last data month = ongoing month (right edge).
  const pixelPerMonth = chartWidth > 0 ? chartWidth / MONTHS_VISIBLE : FALLBACK_PIXEL_PER_MONTH;
  const trendTotalWidth = Math.max(
    trendMonths.length * pixelPerMonth,
    chartWidth + 1,
  );

  // Pan limits: panXMax = "ongoing month at right" (last data month = trendMonths[length-1]); panXMin = 0 = "oldest months at left".
  const panXMax = chartWidth - trendTotalWidth;
  const panXMin = 0;

  // Apply default view (ongoing month at right) on first load/refresh when we have data; otherwise keep pan in bounds.
  useLayoutEffect(() => {
    if (!trendMonths.length || chartWidth <= 0) return;
    const isFirstTimeWithData = needsInitialPanRef.current;
    const dataLengthChanged = defaultPanAppliedForLengthRef.current !== trendMonths.length;
    const applyDefault = isFirstTimeWithData || dataLengthChanged;
    if (applyDefault) {
      needsInitialPanRef.current = false;
      defaultPanAppliedForLengthRef.current = trendMonths.length;
      const targetPan = snapPanToMonth(panXMax, panXMin, panXMax, pixelPerMonth);
      // Defer so this runs after ResizeObserver/other effects that might set pan; ensures refresh shows ongoing month on right
      const id = requestAnimationFrame(() => setPanX(targetPan));
      return () => cancelAnimationFrame(id);
    } else {
      setPanX((prev) =>
        snapPanToMonth(clampPan(prev, panXMin, panXMax), panXMin, panXMax, pixelPerMonth),
      );
    }
  }, [trendMonths.length, chartWidth, trendTotalWidth, panXMax, panXMin, pixelPerMonth]);

  const onMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  const onChartMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const el = containerRef.current;
      if (!el || !trendMonths.length || pixelPerMonth <= 0) return;
      const rect = el.getBoundingClientRect();
      const chartX = e.clientX - rect.left - CHART_PADDING.left;
      const index = Math.round((chartX - panX) / pixelPerMonth);
      const clamped = Math.max(0, Math.min(trendMonths.length - 1, index));
      setHoveredIndex((prev) => (prev === clamped ? prev : clamped));
      setTooltipPos({ x: e.clientX, y: e.clientY });
    },
    [trendMonths.length, panX, pixelPerMonth],
  );

  // Wheel: scroll down = previous months (pan right), scroll up = next months (toward ongoing). One month per step. Ongoing month is the final bound.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !trendMonths.length) return;
    const applyWheel = () => {
      const accumulated = wheelDeltaRef.current;
      wheelDeltaRef.current = 0;
      wheelRafScheduledRef.current = false;
      if (accumulated !== 0 && pixelPerMonth > 0) {
        const direction = Math.sign(accumulated);
        const monthSteps = direction * Math.max(1, Math.min(3, Math.abs(Math.round(accumulated / 80))));
        if (monthSteps !== 0) {
          setPanX((prev) => {
            const next = prev + monthSteps * pixelPerMonth;
            const clamped = clampPan(next, panXMin, panXMax);
            return snapPanToMonth(clamped, panXMin, panXMax, pixelPerMonth);
          });
        }
      }
      if (wheelDeltaRef.current !== 0) {
        wheelRafScheduledRef.current = true;
        requestAnimationFrame(applyWheel);
      }
    };
    const handleWheel = (e: WheelEvent) => {
      const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      wheelDeltaRef.current += delta;
      e.preventDefault();
      if (!wheelRafScheduledRef.current) {
        wheelRafScheduledRef.current = true;
        requestAnimationFrame(applyWheel);
      }
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [trendMonths.length, panXMin, panXMax, pixelPerMonth]);

  const resetChart = useCallback(() => {
    setPanX(snapPanToMonth(panXMax, panXMin, panXMax, pixelPerMonth));
  }, [panXMax, panXMin, pixelPerMonth]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!trendMonths.length || pixelPerMonth <= 0) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPanX((prev) => {
          const next = snapPanToMonth(prev - pixelPerMonth, panXMin, panXMax, pixelPerMonth);
          return next !== prev ? next : prev;
        });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setPanX((prev) => {
          const next = snapPanToMonth(prev + pixelPerMonth, panXMin, panXMax, pixelPerMonth);
          return next !== prev ? next : prev;
        });
      } else if (e.key === "Home") {
        e.preventDefault();
        setPanX(snapPanToMonth(panXMax, panXMin, panXMax, pixelPerMonth));
      } else if (e.key === "End") {
        e.preventDefault();
        setPanX(panXMin);
      }
    },
    [trendMonths.length, panXMin, panXMax, pixelPerMonth],
  );

  // Y axis: fixed 0–100, ticks every 20 (0, 20, 40, 60, 80, 100)
  const yAxisTicks: number[] = [];
  for (let i = 0; i <= Y_AXIS_FIXED_MAX; i += Y_AXIS_INTERVAL) {
    yAxisTicks.push(i);
  }

  const xScaleContent = (index: number) => index * pixelPerMonth;
  const clampY = (v: number) => Math.min(Y_AXIS_FIXED_MAX, Math.max(0, v));
  // 0 at bottom (x-axis line), 100 with top inset so the point is visible
  const yScale = (value: number) =>
    chartHeight - (clampY(value) / Y_AXIS_FIXED_MAX) * (chartHeight - Y_TOP_INSET);

  // Smooth curve using cardinal spline (Catmull-Rom style); x in content space (pan applied by wrapper)
  const generateLinePath = (dataKey: "assigned" | "completed" | "avgScore") => {
    if (!trendMonths.length) return "";
    if (trendMonths.length === 1) {
      return `M ${xScaleContent(0)} ${yScale(trendMonths[0][dataKey])}`;
    }

    const points = trendMonths.map((d, i) => ({
      x: xScaleContent(i),
      y: yScale(d[dataKey]),
    }));

    const tension = 0.3;
    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    return path;
  };

  const defaultPanX = snapPanToMonth(panXMax, panXMin, panXMax, pixelPerMonth);
  const isResetVisible = panX !== defaultPanX;
  const monthLabel = (d: TrendChartDatum) => d.month ?? d.name ?? "";

  // Exactly MONTHS_VISIBLE months: compute the window so we never show 7 labels
  const visibleStartIndex =
    pixelPerMonth > 0
      ? Math.max(0, Math.min(trendMonths.length - MONTHS_VISIBLE, Math.floor(-panX / pixelPerMonth)))
      : 0;
  const visibleEndIndex = Math.min(visibleStartIndex + MONTHS_VISIBLE - 1, trendMonths.length - 1);

  if (!trendMonths?.length) {
    return (
      <div className="relative rounded-lg border border-gray-200 bg-gray-50/50 p-8 text-center">
        {title && (
          <h3 className="text-base font-semibold m-0 mb-2 text-gray-800">{title}</h3>
        )}
        <p className="text-sm text-gray-500 m-0">No trend data available for the selected period.</p>
      </div>
    );
  }

  const chartReady = chartWidth > 0 && chartHeight > 0;
  if (!chartReady) {
    return (
      <div className="relative">
        {title && (
          <h3 className="text-base font-semibold m-0 mb-3 text-gray-800">{title}</h3>
        )}
        <div
          ref={containerRef}
          className="rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50/50"
          style={{ height: `${height}px` }}
        >
          <span className="text-sm text-gray-500">Loading chart…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" role="region" aria-label={title ?? "Trend chart"}>
      {/* Header: title (left), reset + help (right) — chart stays fixed below */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        {title && (
          <h3 className="text-base font-semibold m-0 text-gray-800">
            {title}
          </h3>
        )}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isResetVisible && (
            <Button
              icon={<AimOutlined />}
              onClick={resetChart}
              size="small"
              title="Reset to default view (latest months)"
            >
              Reset
            </Button>
          )}
          <Popover
            content={
              <div className="text-xs text-gray-700 max-w-[280px] space-y-2">
                <div>Use mouse wheel or two-finger trackpad gesture to scroll through months. The chart always ends at the current month.</div>
                <div className="border-t border-gray-200 pt-2 mt-2 text-gray-600">
                  You can scroll left to view earlier months. The right edge is always the ongoing month.
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2 font-medium text-gray-800">Percentage formulas</div>
                <div>Assigned % = (Learners assigned in month ÷ Total learners) × 100</div>
                <div>Completed % = (Learners who completed in month ÷ Total learners) × 100</div>
                <div>Avg Score = Average of assessment scores (0–100) for completions in that month</div>
              </div>
            }
            trigger="click"
            placement="bottomRight"
          >
            <Button
              type="text"
              size="small"
              icon={<InfoCircleOutlined />}
              aria-label="Chart help"
            />
          </Popover>
        </div>
      </div>

      <div
        ref={containerRef}
        role="application"
        tabIndex={0}
        aria-label="Trend chart. Use mouse wheel or trackpad to scroll by month. Arrow keys: pan by month, Home for latest, End for earliest."
        className="relative overflow-hidden select-none outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 rounded-lg"
        style={{
          height: `${height}px`,
          borderRadius: "8px",
          border: "2px solid transparent",
        }}
        onMouseMove={onChartMouseMove}
        onMouseLeave={onMouseLeave}
        onKeyDown={onKeyDown}
      >
        {hoveredIndex !== null && trendMonths[hoveredIndex] && (() => {
          const TOOLTIP_OFFSET = 12;
          const TOOLTIP_WIDTH = 180;
          const TOOLTIP_MIN_HEIGHT = 80;
          const x = tooltipPos.x + TOOLTIP_OFFSET;
          const y = tooltipPos.y - 8;
          const left = Math.min(x, typeof window !== "undefined" ? window.innerWidth - TOOLTIP_WIDTH - 8 : x);
          const top = y - TOOLTIP_MIN_HEIGHT < 8
            ? tooltipPos.y + TOOLTIP_OFFSET
            : y;
          const transform = top > tooltipPos.y ? "none" : "translateY(-100%)";
          return (
            <div
              className="fixed z-[100] px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg pointer-events-none"
              style={{
                left: Math.max(8, left),
                top,
                minWidth: 160,
                maxWidth: 220,
                transform,
              }}
              role="tooltip"
              aria-live="polite"
            >
              <div className="font-semibold border-b border-gray-600 pb-1 mb-1">
                {monthLabel(trendMonths[hoveredIndex])}
              </div>
              <div>Assigned: {trendMonths[hoveredIndex].assigned}%</div>
              <div>Completed: {trendMonths[hoveredIndex].completed}%</div>
              <div>Avg Score: {trendMonths[hoveredIndex].avgScore}%</div>
            </div>
          );
        })()}
        <svg
          ref={chartRef}
          width={containerSize.width}
          height={containerSize.height}
          role="img"
          aria-label={title ? `${title}. Use mouse wheel or trackpad to scroll by month.` : "Trend chart. Assigned, completed, and average score by month. Use mouse wheel or trackpad to scroll."}
        >
          <title>{title ?? "Trend (Assigned % vs Completed % vs Avg Score)"}</title>
          <defs>
            <clipPath id={clipId}>
              <rect
                x={CHART_PADDING.left}
                y={CHART_PADDING.top}
                width={chartWidth}
                height={chartHeight}
              />
            </clipPath>
          </defs>

          <g className="y-axis">
            <line
              x1={CHART_PADDING.left}
              y1={CHART_PADDING.top}
              x2={CHART_PADDING.left}
              y2={containerSize.height - CHART_PADDING.bottom}
              stroke="#e5e7eb"
              strokeWidth="2"
            />
            {yAxisTicks.map((tick) => (
              <g key={tick}>
                <line
                  x1={CHART_PADDING.left}
                  y1={CHART_PADDING.top + yScale(tick)}
                  x2={containerSize.width - CHART_PADDING.right}
                  y2={CHART_PADDING.top + yScale(tick)}
                  stroke="#f3f4f6"
                  strokeWidth="1"
                  strokeDasharray="4"
                />
                <text
                  x={CHART_PADDING.left - 10}
                  y={CHART_PADDING.top + yScale(tick)}
                  textAnchor="end"
                  alignmentBaseline="middle"
                  className="text-xs fill-gray-600"
                >
                  {tick}
                </text>
              </g>
            ))}
          </g>

          <g className="x-axis">
            <line
              x1={CHART_PADDING.left}
              y1={containerSize.height - CHART_PADDING.bottom}
              x2={containerSize.width - CHART_PADDING.right}
              y2={containerSize.height - CHART_PADDING.bottom}
              stroke="#e5e7eb"
              strokeWidth="2"
            />
            {/* Pannable content: transition when not dragging for smooth month-by-month scroll */}
            <g
              transform={`translate(${panX}, 0)`}
              style={{
                willChange: "transform",
                transition: `transform ${PAN_TRANSITION_MS}ms ease-out`,
              }}
            >
              {trendMonths.map((d, i) => {
                if (i < visibleStartIndex || i > visibleEndIndex) return null;
                const groupX = CHART_PADDING.left + xScaleContent(i);
                return (
                  <g key={i}>
                    <text
                      x={groupX}
                      y={containerSize.height - CHART_PADDING.bottom + 20}
                      textAnchor="middle"
                      className="text-xs fill-gray-600"
                    >
                      {monthLabel(d)}
                    </text>
                  </g>
                );
              })}
            </g>
          </g>

          {/* Data group: coordinates relative to chart inner (padding applied via transform) */}
          <g clipPath={`url(#${clipId})`}>
            <g
              transform={`translate(${panX + CHART_PADDING.left}, ${CHART_PADDING.top})`}
              style={{
                willChange: "transform",
                transition: `transform ${PAN_TRANSITION_MS}ms ease-out`,
              }}
            >
              <path
                d={generateLinePath("assigned")}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {trendMonths.map((d, i) => (
                <circle
                  key={`assigned-${i}`}
                  cx={xScaleContent(i)}
                  cy={yScale(d.assigned)}
                  r="5"
                  fill="#3b82f6"
                  stroke="white"
                  strokeWidth="2"
                />
              ))}

              <path
                d={generateLinePath("completed")}
                fill="none"
                stroke="#efaa1f"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {trendMonths.map((d, i) => (
                <circle
                  key={`completed-${i}`}
                  cx={xScaleContent(i)}
                  cy={yScale(d.completed)}
                  r="5"
                  fill="#efaa1f"
                  stroke="white"
                  strokeWidth="2"
                />
              ))}

              <path
                d={generateLinePath("avgScore")}
                fill="none"
                stroke="#f97316"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {trendMonths.map((d, i) => (
                <circle
                  key={`score-${i}`}
                  cx={xScaleContent(i)}
                  cy={yScale(d.avgScore)}
                  r="5"
                  fill="#f97316"
                  stroke="white"
                  strokeWidth="2"
                />
              ))}
            </g>
          </g>
        </svg>
      </div>

      {/* Legend: below center of chart */}
      <div className="flex justify-center gap-6 mt-3 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-blue-500 rounded" />
          <span>Assigned</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-[#efaa1f] rounded" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-orange-500 rounded" />
          <span>Avg Assessment Score</span>
        </div>
      </div>
    </div>
  );
};

export default TrendChart;
