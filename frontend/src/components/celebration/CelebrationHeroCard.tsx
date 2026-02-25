import { useState } from "react";
import { Card, Typography, Button } from "antd";
import { theme } from "antd";
import { CloseOutlined } from "@ant-design/icons";

const { useToken } = theme;
const { Title, Paragraph, Text } = Typography;

const STORAGE_KEY = "celebration-hero-dismissed";

export interface CelebrationHeroCardProps {
  type: "birthday" | "work_anniversary";
  greeting: string;
  messageBody: string;
  companyName: string;
  yearsOfService?: number;
}

export default function CelebrationHeroCard({
  type,
  greeting,
  messageBody,
  companyName,
}: CelebrationHeroCardProps) {
  const { token } = useToken();
  const [dismissed, setDismissed] = useState(() => {
    try {
      const key = `${STORAGE_KEY}-${new Date().toISOString().slice(0, 10)}`;
      return sessionStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    try {
      const key = `${STORAGE_KEY}-${new Date().toISOString().slice(0, 10)}`;
      sessionStorage.setItem(key, "1");
    } catch {}
    setDismissed(true);
  };

  if (dismissed) return null;

  const isBirthday = type === "birthday";

  return (
    <div className="celebration-hero-wrapper" style={{ marginBottom: 24 }}>
      <Card
        bordered={false}
        className="celebration-hero-card"
        style={{
          width: "100%",
          overflow: "hidden",
          position: "relative",
          background: isBirthday
            ? `linear-gradient(135deg, ${token.colorWarning}22 0%, ${token.colorError}11 50%, ${token.colorWarning}22 100%)`
            : `linear-gradient(135deg, ${token.colorPrimary}18 0%, ${token.colorTextSecondary}0a 50%, ${token.colorPrimary}18 100%)`,
          backgroundSize: "200% 200%",
        }}
        styles={{
          body: { padding: "24px 48px 24px 24px", position: "relative" },
        }}
      >
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={handleDismiss}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            color: token.colorTextSecondary,
          }}
          aria-label="Dismiss"
        />
        <div className="celebration-hero-emoji celebration-hero-emoji-1">🎂</div>
        <div className="celebration-hero-emoji celebration-hero-emoji-2">🎉</div>
        <div className="celebration-hero-emoji celebration-hero-emoji-3">🌟</div>

        <Title level={2} style={{ marginBottom: 8, color: token.colorTextHeading }}>
          {greeting}
        </Title>
        <Paragraph
          style={{
            fontSize: 16,
            lineHeight: 1.6,
            color: token.colorTextSecondary,
            marginBottom: 12,
            whiteSpace: "pre-wrap",
          }}
        >
          {messageBody}
        </Paragraph>
        <Text type="secondary" style={{ fontSize: 13 }}>
          From: {companyName}
        </Text>
      </Card>

      <style>{`
        .celebration-hero-card {
          animation: celebration-shimmer 8s ease-in-out infinite;
        }
        @keyframes celebration-shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .celebration-hero-emoji {
          position: absolute;
          font-size: 24px;
          opacity: 0.6;
          pointer-events: none;
          animation: celebration-float 4s ease-in-out infinite;
        }
        .celebration-hero-emoji-1 { top: 20%; left: 8%; animation-delay: 0s; }
        .celebration-hero-emoji-2 { top: 60%; right: 12%; animation-delay: 1.3s; }
        .celebration-hero-emoji-3 { bottom: 25%; left: 15%; animation-delay: 2.6s; }
        @keyframes celebration-float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
          50% { transform: translateY(-8px) scale(1.05); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
