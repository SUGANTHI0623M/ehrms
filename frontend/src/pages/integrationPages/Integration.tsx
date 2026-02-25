import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import IntegrationCard from "./components/IntegrationCard";
import integrationList from "./integrationList";
import { Plug2 } from "lucide-react";
import { useGetSendPulseConfigQuery } from "@/store/api/sendpulseApi";
import { useGetAskevaConfigQuery } from "@/store/api/askevaApi";

const Integration = () => {
  // Fetch SendPulse config to determine status
  const { data: sendPulseConfig } = useGetSendPulseConfigQuery();
  // Fetch Askeva config to determine status
  const { data: askevaConfig } = useGetAskevaConfigQuery();

  // Create enhanced integration list with dynamic status
  const enhancedIntegrationList = integrationList.map((integration) => {
    // Update SendPulse status based on actual config
    if (integration.key === 'sendpulse') {
      const config = sendPulseConfig?.data?.config;
      return {
        ...integration,
        status: config?.isConnected 
          ? 'connected' as const
          : config?.isEnabled 
          ? 'pending' as const
          : 'disconnected' as const
      };
    }
    // Update Askeva status based on actual config
    if (integration.key === 'askeva') {
      const config = askevaConfig?.data?.config;
      return {
        ...integration,
        status: config?.isConnected 
          ? 'connected' as const
          : config?.isEnabled 
          ? 'pending' as const
          : 'disconnected' as const
      };
    }
    return integration;
  });

  return (
    <MainLayout>
      <main className="p-4">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Plug2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Integrations</h1>
          </div>
          <p className="text-muted-foreground">
            Connect and configure third-party services to enhance your HRMS experience
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Available Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              // Group integrations by category
              const grouped: Record<string, typeof enhancedIntegrationList> = {};
              const uncategorized: typeof enhancedIntegrationList = [];
              
              enhancedIntegrationList.forEach((integration) => {
                if (integration.category) {
                  if (!grouped[integration.category]) {
                    grouped[integration.category] = [];
                  }
                  grouped[integration.category].push(integration);
                } else {
                  uncategorized.push(integration);
                }
              });
              
              return (
                <div className="space-y-8">
                  {/* Grouped by category */}
                  {Object.entries(grouped).map(([category, integrations]) => (
                    <div key={category} className="space-y-4">
                      <h3 className="text-xl font-semibold text-foreground border-b pb-2">
                        {category}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {integrations.map((integration) => (
                          <IntegrationCard key={integration.key} integration={integration} />
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {/* Uncategorized */}
                  {uncategorized.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold text-foreground border-b pb-2">
                        Other Integrations
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {uncategorized.map((integration) => (
                          <IntegrationCard key={integration.key} integration={integration} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </main>
    </MainLayout>
  );
};

export default Integration;

