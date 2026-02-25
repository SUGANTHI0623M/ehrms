import { useState, useEffect, useCallback } from "react";
import { Card, Typography, Tag, Avatar, Button } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { theme } from "antd";
import dayjs from "dayjs";

const { useToken } = theme;
const { Title, Text } = Typography;

const AUTO_ADVANCE_MS = 5000;
const TRANSITION_MS = 500;
const CONFETTI_COUNT = 14;

export interface CelebrationItem {
  name: string;
  type: "birthday" | "anniversary";
  date: string;
  department: string;
  avatar?: string;
}

function getInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name || "?").slice(0, 2).toUpperCase();
}

function ConfettiBurst({ token }: { token: any }) {
  const colors = [token.colorPrimary, token.colorWarning, token.colorInfo];
  return (
    <div className="celebration-confetti" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {Array.from({ length: CONFETTI_COUNT }, (_, i) => (
        <span
          key={i}
          style={{
            left: `${15 + (i * 5) % 70}%`,
            top: `${50 + (i * 7) % 40}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i / CONFETTI_COUNT) * 0.6}s`,
            animationDuration: `${0.8 + (i % 5) * 0.12}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function CelebrationHighlightCard({
  celebrations,
  loading,
}: {
  celebrations: CelebrationItem[];
  loading?: boolean;
}) {
  const { token } = useToken();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [leavingIndex, setLeavingIndex] = useState<number | null>(null);

  const count = celebrations.length;
  const hasSlides = count > 0;
  const current = hasSlides ? celebrations[currentIndex] : null;

  const goTo = useCallback(
    (next: number) => {
      if (count <= 1) return;
      const nextIndex = (next + count) % count;
      setLeavingIndex(currentIndex);
      setCurrentIndex(nextIndex);
      setTimeout(() => setLeavingIndex(null), TRANSITION_MS);
    },
    [count, currentIndex]
  );

  const goNext = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex]);

  useEffect(() => {
    if (!hasSlides || count <= 1) return;
    const t = setInterval(goNext, AUTO_ADVANCE_MS);
    return () => clearInterval(t);
  }, [hasSlides, count, currentIndex, goNext]);

  const isBirthday = current?.type === "birthday";
  const gradientBg =
    current &&
    (isBirthday
      ? `linear-gradient(135deg, ${token.colorWarningBg} 0%, ${token.colorPrimaryBg} 50%, ${token.colorWarningBg} 100%)`
      : `linear-gradient(135deg, ${token.colorInfoBg} 0%, ${token.colorPrimaryBg} 50%, ${token.colorInfoBg} 100%)`);

  return (
    <Card
      loading={loading}
      className="lms-card celebration-kpi-card celebration-highlight-card"
      styles={{
        body: {
          padding: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        },
      }}
      style={{
        borderTop: `3px solid ${token.colorPrimary}`,
        overflow: "hidden",
        position: "relative",
        height: "100%",
      }}
    >
      <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${token.colorBorderSecondary}`, flexShrink: 0 }}>
        <Text strong style={{ fontSize: 15, color: token.colorTextHeading }}>
          Today's Celebrations
        </Text>
        {hasSlides && (
          <Tag color="processing">{count} celebrating today</Tag>
        )}
      </div>

      <div style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {!hasSlides ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, flex: 1, minHeight: 0 }}>
            <span style={{ fontSize: 36, marginBottom: 8 }}>🎉</span>
            <Text type="secondary">No celebrations today</Text>
          </div>
        ) : (
          <>
            <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <div className="celebration-nav-arrows" style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)", zIndex: 10 }}>
                <Button
                  type="text"
                  shape="circle"
                  size="small"
                  icon={<LeftOutlined />}
                  onClick={goPrev}
                  style={{ background: token.colorBgContainer, boxShadow: token.boxShadowSecondary }}
                />
              </div>
              <div className="celebration-nav-arrows" style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", zIndex: 10 }}>
                <Button
                  type="text"
                  shape="circle"
                  size="small"
                  icon={<RightOutlined />}
                  onClick={goNext}
                  style={{ background: token.colorBgContainer, boxShadow: token.boxShadowSecondary }}
                />
              </div>

              <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
                {leavingIndex !== null && celebrations[leavingIndex] && (
                <div
                  className="slide-exit slide-exit-active"
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      celebrations[leavingIndex].type === "birthday"
                        ? `linear-gradient(135deg, ${token.colorWarningBg} 0%, ${token.colorPrimaryBg} 50%, ${token.colorWarningBg} 100%)`
                        : `linear-gradient(135deg, ${token.colorInfoBg} 0%, ${token.colorPrimaryBg} 50%, ${token.colorInfoBg} 100%)`,
                    backgroundSize: "300%",
                    padding: "8px 24px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  <SlideContent celebration={celebrations[leavingIndex]} token={token} />
                </div>
              )}
              <div
                className={leavingIndex !== null ? "slide-enter slide-enter-active celebration-slide-bg" : "celebration-slide-bg"}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: gradientBg,
                  padding: "8px 24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                <ConfettiBurst key={currentIndex} token={token} />
                <SlideContent celebration={current!} token={token} />
              </div>
              </div>
            </div>
            {count > 1 && (
              <div style={{ display: "flex", gap: 4, padding: "8px 16px", justifyContent: "center", alignItems: "center", flexShrink: 0 }}>
                {celebrations.map((_, i) => (
                  <div
                    key={i}
                    className={i === currentIndex ? "celebration-pill-active" : ""}
                    style={{
                      flex: i === currentIndex ? "1 1 0" : "0 0 auto",
                      maxWidth: i === currentIndex ? 40 : 8,
                      height: 4,
                      borderRadius: 2,
                      background: token.colorBorder,
                      overflow: "hidden",
                    }}
                  >
                    {i === currentIndex && (
                      <div
                        key={currentIndex}
                        className="celebration-pill-fill"
                        style={{
                          height: "100%",
                          width: "100%",
                          background: token.colorPrimary,
                          borderRadius: 2,
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

function SlideContent({ celebration, token }: { celebration: CelebrationItem; token: any }) {
  const isBirthday = celebration.type === "birthday";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        minWidth: 0,
        maxWidth: "100%",
        flexShrink: 1,
        width: "100%",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, minWidth: 0, flex: 1 }}>
        <span className="celebration-emoji-center" style={{ fontSize: 36, lineHeight: 1 }}>
          {isBirthday ? "🎂" : "🌟"}
        </span>
        <Title
          level={4}
          ellipsis
          style={{
            margin: 0,
            textAlign: "left",
            color: token.colorTextHeading,
            fontSize: 18,
            lineHeight: 1.3,
            maxWidth: "100%",
          }}
        >
          {celebration.name}
        </Title>
        <Tag color={isBirthday ? "gold" : "cyan"} style={{ margin: 0, fontSize: 12 }}>
          {isBirthday ? "🎂 Birthday" : "🌟 Anniversary"}
        </Tag>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, minWidth: 0, flexShrink: 0 }}>
        <Text type="secondary" style={{ fontSize: 15, lineHeight: 1.3, fontWeight: 500 }}>
          {celebration.date ? dayjs(celebration.date).format("MMM D") : "—"}
        </Text>
        <Text type="secondary" ellipsis style={{ fontSize: 13, lineHeight: 1.3, maxWidth: "100%", textAlign: "right" }}>
          {celebration.department || "—"}
        </Text>
      </div>
    </div>
  );
}
