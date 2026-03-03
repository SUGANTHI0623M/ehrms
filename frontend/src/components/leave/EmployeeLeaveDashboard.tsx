import { Row, Col, Card, Typography, Divider, Tag } from "antd";
import { theme } from "antd";
import { CalendarOutlined, InboxOutlined } from "@ant-design/icons";
import styles from "./EmployeeLeaveDashboard.module.css";

const { useToken } = theme;
const { Text, Title } = Typography;

export type LeaveSummaryType = "Week-end" | "Casual Leave" | "Half Day" | "Holidays";

export interface LeaveSummaryRow {
  type: LeaveSummaryType;
  total: number;
  completed: number;
  available: number;
}

export interface TotalRequestsSummary {
  totalRequests: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
}

export interface EmployeeLeaveDashboardProps {
  /** Rows for "Total Leave This Month" table: Week-end, Casual Leave, Half Day, Holidays. All values passed from parent (backend-driven). */
  leaveSummaryRows: LeaveSummaryRow[];
  /** Total leave count shown in left card header badge (e.g. sum of totals or display count). */
  totalLeaveCount: number;
  /** Total requests and status breakdown for current month. */
  totalRequestsSummary: TotalRequestsSummary;
}

const ROW_ORDER: LeaveSummaryType[] = ["Week-end", "Casual Leave", "Half Day", "Holidays"];

const DOT_TOKEN_MAP: Record<LeaveSummaryType, "colorPrimary" | "colorSuccess" | "colorWarning" | "colorError"> = {
  "Week-end": "colorPrimary",
  "Casual Leave": "colorSuccess",
  "Half Day": "colorWarning",
  "Holidays": "colorError",
};

const BG_TOKEN_MAP: Record<LeaveSummaryType, "colorPrimaryBg" | "colorSuccessBg" | "colorWarningBg" | "colorErrorBg"> = {
  "Week-end": "colorPrimaryBg",
  "Casual Leave": "colorSuccessBg",
  "Half Day": "colorWarningBg",
  "Holidays": "colorErrorBg",
};

const TYPE_INITIAL: Record<LeaveSummaryType, string> = {
  "Week-end": "W",
  "Casual Leave": "C",
  "Half Day": "H",
  "Holidays": "D",
};

function getOrderedRows(rows: LeaveSummaryRow[]): LeaveSummaryRow[] {
  const byType = new Map(rows.map((r) => [r.type, r]));
  return ROW_ORDER.map((type) => byType.get(type) ?? { type, total: 0, completed: 0, available: 0 } as LeaveSummaryRow);
}

const EmployeeLeaveDashboard = ({
  leaveSummaryRows,
  totalLeaveCount,
  totalRequestsSummary,
}: EmployeeLeaveDashboardProps) => {
  const { token } = useToken();
  const orderedRows = getOrderedRows(leaveSummaryRows);
  const { totalRequests, approvedCount, rejectedCount, pendingCount } = totalRequestsSummary;

  const approvedPct = totalRequests > 0 ? (approvedCount / totalRequests) * 100 : 0;
  const rejectedPct = totalRequests > 0 ? (rejectedCount / totalRequests) * 100 : 0;
  const pendingPct = totalRequests > 0 ? (pendingCount / totalRequests) * 100 : 0;

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      {/* Left Card — Total Leave This Month */}
      <Col xs={24} md={18} className={styles.cardWrapper}>
        <div
          className={`${styles.cardShadowWrapper} ${styles.fadeSlideUpLeft}`}
          style={{
            ["--card-shadow" as string]: token.boxShadow,
            borderRadius: token.borderRadiusLG,
            borderLeft: `3px solid ${token.colorPrimary}`,
          }}
        >
          <Card
            style={{
              borderRadius: token.borderRadiusLG,
              boxShadow: "none",
              background: token.colorBgContainer,
              height: "100%",
            }}
            styles={{ body: {
              padding: "16px 20px",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            } }}
          >
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: token.borderRadiusSM,
                background: token.colorPrimaryBg,
                color: token.colorPrimary,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <CalendarOutlined style={{ fontSize: 18 }} />
            </span>
            <Text strong style={{ flex: 1, minWidth: 0 }}>Total Leave This Month</Text>
            <Tag
              style={{
                margin: 0,
                background: token.colorPrimary,
                color: token.colorTextLightSolid,
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 99,
                padding: "2px 12px",
                border: "none",
              }}
            >
              {totalLeaveCount}
            </Tag>
          </div>
          <Divider style={{ margin: "12px 0 16px" }} />
          <div className={styles.cardBody} style={{ flex: 1 }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "none",
                tableLayout: "fixed",
              }}
              role="grid"
            >
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "6px 12px", width: "22%" }}>
                    <Text style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: token.colorTextTertiary }}>
                      Type
                    </Text>
                  </th>
                  <th style={{ textAlign: "left", padding: "6px 12px", width: "18%" }}>
                    <Text style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: token.colorTextTertiary }}>
                      Total
                    </Text>
                  </th>
                  <th style={{ textAlign: "left", padding: "6px 12px", width: "20%" }}>
                    <Text style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: token.colorTextTertiary }}>
                      Completed
                    </Text>
                  </th>
                  <th style={{ textAlign: "left", padding: "6px 12px", width: "25%" }}>
                    <Text style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: token.colorTextTertiary }}>
                      Available
                    </Text>
                  </th>
                </tr>
              </thead>
              <tbody>
                {orderedRows.map((row, index) => {
                  const accentColor = token[DOT_TOKEN_MAP[row.type]];
                  const isEven = index % 2 === 0;
                  const availablePct = row.total > 0 ? (row.available / row.total) * 100 : 0;
                  return (
                    <tr
                      key={row.type}
                      style={{
                        height: 52,
                        background: isEven ? token.colorFillAlter : "transparent",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = token.colorFillSecondary;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isEven ? token.colorFillAlter : "transparent";
                      }}
                    >
                      <td style={{ padding: "8px 12px", border: "none", verticalAlign: "middle" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: token.borderRadiusSM,
                              background: token[BG_TOKEN_MAP[row.type]],
                              color: accentColor,
                              fontSize: 11,
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {TYPE_INITIAL[row.type]}
                          </span>
                          <Text strong style={{ fontSize: 13 }}>
                            {row.type}
                          </Text>
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px", border: "none", verticalAlign: "middle" }}>
                        <Text strong>{row.total}</Text>
                      </td>
                      <td style={{ padding: "8px 12px", border: "none", verticalAlign: "middle" }}>
                        <Text style={{ color: row.completed > 0 ? token.colorError : token.colorTextSecondary }}>
                          {row.completed}
                        </Text>
                      </td>
                      <td style={{ padding: "8px 12px", border: "none", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <Text strong style={{ color: token.colorSuccess }}>
                            {row.available}
                          </Text>
                          <div
                            style={{
                              height: 5,
                              borderRadius: 99,
                              background: token.colorBorderSecondary,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              className={`${styles.progressBar} ${styles[`progressBarDelay${index}` as keyof typeof styles]}`}
                              style={{
                                height: "100%",
                                borderRadius: 99,
                                background: accentColor,
                                ["--pct" as string]: availablePct,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </Card>
        </div>
      </Col>

      {/* Right Card — Total Requests */}
      <Col xs={24} md={6} className={styles.cardWrapper}>
        <div
          className={`${styles.cardShadowWrapper} ${styles.fadeSlideUpRight}`}
          style={{
            ["--card-shadow" as string]: token.boxShadow,
            borderRadius: token.borderRadiusLG,
            borderLeft: `3px solid ${token.colorWarning}`,
          }}
        >
          <Card
            style={{
              borderRadius: token.borderRadiusLG,
              boxShadow: "none",
              background: token.colorBgContainer,
              height: "100%",
            }}
            styles={{ body: {
              padding: "16px 20px",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            } }}
          >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: token.borderRadiusSM,
                background: token.colorWarningBg,
                color: token.colorWarning,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <InboxOutlined style={{ fontSize: 18 }} />
            </span>
            <Text strong>Total Requests</Text>
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
            <span
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                border: `3px solid ${token.colorPrimary}`,
                boxShadow: `0 0 12px ${token.colorPrimaryBorder ?? token.colorPrimary}`,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Title level={2} style={{ margin: 0, color: token.colorPrimary }}>
                {totalRequests}
              </Title>
            </span>
          </div>
          <Divider style={{ margin: "12px 0 16px" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
            {/* Approved */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Text>Approved</Text>
                <Tag color="success">{approvedCount}</Tag>
              </div>
              <div
                style={{
                  height: 4,
                  borderRadius: 99,
                  background: token.colorBorderSecondary,
                  marginTop: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  className={`${styles.progressBarRight} ${styles.progressBarDelay0}`}
                  style={{
                    height: "100%",
                    borderRadius: 99,
                    background: token.colorSuccess,
                    ["--pct" as string]: approvedPct,
                  }}
                />
              </div>
            </div>
            {/* Rejected */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Text>Rejected</Text>
                <Tag color="error">{rejectedCount}</Tag>
              </div>
              <div
                style={{
                  height: 4,
                  borderRadius: 99,
                  background: token.colorBorderSecondary,
                  marginTop: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  className={`${styles.progressBarRight} ${styles.progressBarDelay1}`}
                  style={{
                    height: "100%",
                    borderRadius: 99,
                    background: token.colorError,
                    ["--pct" as string]: rejectedPct,
                  }}
                />
              </div>
            </div>
            {/* Pending */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Text>Pending</Text>
                <Tag color="warning">{pendingCount}</Tag>
              </div>
              <div
                style={{
                  height: 4,
                  borderRadius: 99,
                  background: token.colorBorderSecondary,
                  marginTop: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  className={`${styles.progressBarRight} ${styles.progressBarDelay2}`}
                  style={{
                    height: "100%",
                    borderRadius: 99,
                    background: token.colorWarning,
                    ["--pct" as string]: pendingPct,
                  }}
                />
              </div>
            </div>
          </div>
          <div style={{ marginTop: "auto", paddingTop: 12, display: "flex", justifyContent: "center" }}>
            <Tag color="default">{totalRequests} requests this month</Tag>
          </div>
          </Card>
        </div>
      </Col>
    </Row>
  );
};

export default EmployeeLeaveDashboard;
