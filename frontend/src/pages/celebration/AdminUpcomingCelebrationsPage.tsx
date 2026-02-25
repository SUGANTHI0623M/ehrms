import { useState } from "react";
import MainLayout from "@/components/MainLayout";
import { Tabs, Tag, Button, List, Avatar, Typography, Row, Col, Card, Space, message } from "antd";
import { theme } from "antd";
import { StarOutlined, TrophyOutlined } from "@ant-design/icons";
import { useGetUpcomingQuery, useSendWishNowMutation } from "@/store/api/celebrationApi";
import dayjs from "dayjs";

const { useToken } = theme;
const { Text } = Typography;

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function AdminUpcomingCelebrationsPage() {
  const { token } = useToken();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const { data, isLoading } = useGetUpcomingQuery({ year, month });
  const [sendWishNow, { isLoading: sending }] = useSendWishNowMutation();
  const [activeTab, setActiveTab] = useState<string>("birthdays");

  const birthdays = data?.data?.birthdays ?? [];
  const anniversaries = data?.data?.anniversaries ?? [];

  const handleSendWish = async (templateId: string | null | undefined, staffId: string) => {
    if (!templateId) {
      message.warning("No template assigned for this staff. Assign a template from Celebration Templates.");
      return;
    }
    try {
      await sendWishNow({ templateId, staffId }).unwrap();
      message.success("Wish sent");
    } catch (e: any) {
      message.error(e?.data?.error?.message || "Failed to send");
    }
  };

  const summaryChips = (
    <Space split={<span style={{ color: token.colorTextQuaternary }}> · </span>} style={{ marginBottom: 16 }}>
      <Text type="secondary">
        <StarOutlined /> {birthdays.length} Birthdays this month
      </Text>
      <Text type="secondary">
        <TrophyOutlined /> {anniversaries.length} Upcoming anniversaries this month
      </Text>
    </Space>
  );

  return (
    <MainLayout>
      <div style={{ padding: 24, background: token.colorBgContainer }}>
        <Typography.Title level={4} style={{ marginBottom: 8, color: token.colorTextHeading }}>
          Upcoming Celebrations
        </Typography.Title>
        {summaryChips}

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "birthdays",
              label: (
                <span>
                  <StarOutlined /> Birthdays
                </span>
              ),
              children: (
                <Card size="small" style={{ background: token.colorBgLayout }}>
                  {birthdays.length === 0 ? (
                    <Text type="secondary">No birthdays this month.</Text>
                  ) : (
                    <List
                      itemLayout="horizontal"
                      dataSource={birthdays}
                      loading={isLoading}
                      renderItem={(item: any) => {
                        const staff = item.staff;
                        const dateStr = dayjs(item.date).format("MMM D");
                        const isToday = item.isToday;
                        return (
                          <List.Item
                            extra={
                              <Button
                                type="primary"
                                size="small"
                                loading={sending}
                                onClick={() => handleSendWish(item.templateId, staff._id)}
                              >
                                Send Wish Now
                              </Button>
                            }
                          >
                            <List.Item.Meta
                              avatar={
                                <Avatar style={{ background: token.colorPrimary }}>{getInitials(staff?.name || "?")}</Avatar>
                              }
                              title={
                                <Space>
                                  <Text strong>{staff?.name}</Text>
                                  {item.templateAutoSend && (
                                    <Tag color="success" style={{ fontSize: 11 }}>
                                      Auto-send enabled
                                    </Tag>
                                  )}
                                  {isToday && (
                                    <Tag color="gold">Today 🎂</Tag>
                                  )}
                                </Space>
                              }
                              description={
                                <Row gutter={8}>
                                  <Col>
                                    <Text type="secondary">{staff?.department}</Text>
                                  </Col>
                                  <Col>
                                    <Text type="secondary">{dateStr}</Text>
                                  </Col>
                                </Row>
                              }
                            />
                          </List.Item>
                        );
                      }}
                    />
                  )}
                </Card>
              ),
            },
            {
              key: "anniversaries",
              label: (
                <span>
                  <TrophyOutlined /> Work Anniversaries
                </span>
              ),
              children: (
                <Card size="small" style={{ background: token.colorBgLayout }}>
                  {anniversaries.length === 0 ? (
                    <Text type="secondary">No upcoming work anniversaries this month.</Text>
                  ) : (
                    <List
                      itemLayout="horizontal"
                      dataSource={anniversaries}
                      loading={isLoading}
                      renderItem={(item: any) => {
                        const staff = item.staff;
                        const dateStr = dayjs(item.date).format("MMM D");
                        const isToday = item.isToday;
                        const years = item.yearsOfService;
                        return (
                          <List.Item
                            extra={
                              <Button
                                type="primary"
                                size="small"
                                loading={sending}
                                onClick={() => handleSendWish(item.templateId, staff._id)}
                              >
                                Send Wish Now
                              </Button>
                            }
                          >
                            <List.Item.Meta
                              avatar={
                                <Avatar style={{ background: token.colorPrimary }}>{getInitials(staff?.name || "?")}</Avatar>
                              }
                              title={
                                <Space>
                                  <Text strong>{staff?.name}</Text>
                                  {item.templateAutoSend && (
                                    <Tag color="success" style={{ fontSize: 11 }}>
                                      Auto-send enabled
                                    </Tag>
                                  )}
                                  {isToday && (
                                    <Tag color="gold">Today 🎂</Tag>
                                  )}
                                </Space>
                              }
                              description={
                                <Row gutter={8}>
                                  {years != null && (
                                    <Col>
                                      <Text type="secondary">Completed: {years} year{years !== 1 ? "s" : ""}</Text>
                                    </Col>
                                  )}
                                  <Col>
                                    <Text type="secondary">{dateStr}</Text>
                                  </Col>
                                  <Col>
                                    <Text type="secondary">{staff?.department}</Text>
                                  </Col>
                                </Row>
                              }
                            />
                          </List.Item>
                        );
                      }}
                    />
                  )}
                </Card>
              ),
            },
          ]}
        />
      </div>
    </MainLayout>
  );
}
