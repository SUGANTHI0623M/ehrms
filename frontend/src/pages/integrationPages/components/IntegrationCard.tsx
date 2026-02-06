import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Settings, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { IntegrationItem } from "../integrationList";

interface IntegrationCardProps {
  integration: IntegrationItem;
}

const IntegrationCard = ({ integration }: IntegrationCardProps) => {
  const navigate = useNavigate();

  const getStatusIcon = () => {
    switch (integration.status) {
      case 'connected':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (integration.status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500">Connected</Badge>;
      case 'pending':
        return <Badge variant="default" className="bg-yellow-500">Pending</Badge>;
      default:
        return <Badge variant="secondary">Not Connected</Badge>;
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                {/* Integration Icon/Image */}
                <div className="flex items-center justify-center" style={{ minHeight: '96px', minWidth: '96px' }}>
                  {integration.image_url ? (
                    <img 
                      src={integration.image_url} 
                      alt={integration.name}
                      className="object-contain"
                      style={{ 
                        maxWidth: '96px', 
                        maxHeight: '96px',
                        width: 'auto',
                        height: 'auto'
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                      <div className="text-2xl font-bold text-muted-foreground">
                        {integration.name.charAt(0)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Integration Name */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">{integration.name}</h3>
                  <p className="text-sm text-muted-foreground">{integration.description}</p>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  {getStatusIcon()}
                  {getStatusBadge()}
                </div>

                {/* Configure Button */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(integration.route);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent>
          <p>{integration.hoverMessage}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default IntegrationCard;

