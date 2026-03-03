import { Card, Typography } from "antd";
import { theme } from "antd";

const { useToken } = theme;
const { Title, Paragraph, Text } = Typography;

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
          body: { padding: "24px 24px", position: "relative" },
        }}
      >
        <div className="celebration-hero-emoji celebration-hero-emoji-popper" aria-hidden>🎉</div>

        <Title level={2} style={{ marginBottom: 8, color: token.colorTextHeading }}>
          {greeting}
          {isBirthday ? " 🎂" : " 🏆"}
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
          From: {companyName} 🌟
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
        .celebration-hero-emoji-popper {
          position: absolute;
          bottom: 16px;
          right: 16px;
          font-size: 28px;
          opacity: 1;
          pointer-events: none;
          line-height: 1;
        }
      `}</style>
    </div>
  );
}
