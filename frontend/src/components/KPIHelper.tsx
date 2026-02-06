import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";

/**
 * KPI Helper Component
 * Explains what KPI is and provides examples
 */
export const KPIHelper = () => {
  const examples = [
    {
      category: "Development",
      examples: [
        { kpi: "Code Review Score", target: "4.5/5" },
        { kpi: "Bug Rate", target: "< 2 bugs per sprint" },
        { kpi: "Test Coverage", target: "90%" },
        { kpi: "Code Quality Score", target: "A rating" },
      ],
    },
    {
      category: "Sales & Business",
      examples: [
        { kpi: "Revenue", target: "$50,000" },
        { kpi: "New Clients", target: "10 clients" },
        { kpi: "Conversion Rate", target: "25%" },
        { kpi: "Sales Calls", target: "50 calls/month" },
      ],
    },
    {
      category: "Customer Service",
      examples: [
        { kpi: "Customer Satisfaction", target: "4.5/5" },
        { kpi: "Response Time", target: "< 2 hours" },
        { kpi: "Ticket Resolution", target: "95% within SLA" },
        { kpi: "Customer Retention", target: "90%" },
      ],
    },
    {
      category: "Marketing",
      examples: [
        { kpi: "Lead Generation", target: "100 leads/month" },
        { kpi: "Click-Through Rate", target: "5%" },
        { kpi: "Campaign ROI", target: "300%" },
        { kpi: "Social Engagement", target: "10K impressions" },
      ],
    },
    {
      category: "Operations",
      examples: [
        { kpi: "Project Completion", target: "100% on time" },
        { kpi: "Quality Score", target: "95%" },
        { kpi: "Delivery Time", target: "< 48 hours" },
        { kpi: "Efficiency Rate", target: "85%" },
      ],
    },
  ];

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600" />
          What is KPI?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">
            <strong>KPI (Key Performance Indicator)</strong> is a measurable value that demonstrates
            how effectively you're achieving your goal. It's the specific metric you'll track to
            measure success.
          </p>
          <p className="mb-3">
            <strong>Target</strong> is the specific value you want to achieve for that KPI.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Examples by Category:</h4>
          {examples.map((category) => (
            <div key={category.category} className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                {category.category}:
              </p>
              <div className="grid grid-cols-1 gap-1 pl-2">
                {category.examples.map((example, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-muted-foreground flex items-center gap-2"
                  >
                    <span className="font-medium">{example.kpi}:</span>
                    <span>{example.target}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t text-xs text-muted-foreground">
          <p>
            <strong>Tip:</strong> Make your KPI specific, measurable, and relevant to your role.
            The target should be challenging but achievable.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};


