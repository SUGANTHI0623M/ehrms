import { useState, useMemo } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, Tabs, Modal, Pagination } from "antd";
import { Eye, Package } from "lucide-react";
import { 
  useGetAssetsQuery,
  Asset
} from "@/store/api/assetsApi";
import { useAppSelector } from "@/store/hooks";
import dayjs from "dayjs";

const { TabPane } = Tabs;

const EmployeeAssets = () => {
  const [tabKey, setTabKey] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Memoize query params
  const queryParams = useMemo(() => {
    return {
      page: currentPage,
      limit: pageSize,
    };
  }, [currentPage, pageSize]);

  // Fetch assets - backend will automatically filter by employee's staff ID
  const { data: assetsData, isLoading } = useGetAssetsQuery(queryParams, {
    refetchOnMountOrArgChange: true,
  });

  const allAssets = assetsData?.data?.assets || [];
  const totalAssets = assetsData?.data?.pagination?.total || 0;

  // Client-side filtering by status tab
  const filteredAssets = useMemo(() => {
    if (tabKey === "all") {
      return allAssets;
    }
    
    const statusMap: Record<string, string> = {
      working: "Working",
      maintenance: "Under Maintenance",
      damaged: "Damaged",
      retired: "Retired"
    };
    
    const targetStatus = statusMap[tabKey] || tabKey;
    return allAssets.filter(asset => asset.status === targetStatus);
  }, [allAssets, tabKey]);

  const handleTabChange = (key: string) => {
    setTabKey(key);
    setCurrentPage(1); // Reset to first page when tab changes
  };

  const handleViewDetails = (asset: Asset) => {
    Modal.info({
      title: "Asset Details",
      width: 600,
      content: (
        <div className="space-y-3">
          {asset.image && (
            <div className="mb-4">
              <img 
                src={asset.image} 
                alt={asset.name}
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Asset Name</p>
              <p className="font-semibold">{asset.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-semibold">{asset.type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Asset Category</p>
              <p className="font-semibold">{asset.assetTypeId?.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Serial Number</p>
              <p className="font-semibold">{asset.serialNumber || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                asset.status === "Working" ? "bg-green-100 text-green-700" :
                asset.status === "Under Maintenance" ? "bg-yellow-100 text-yellow-700" :
                asset.status === "Damaged" ? "bg-red-100 text-red-700" :
                "bg-gray-100 text-gray-700"
              }`}>
                {asset.status}
              </span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Branch</p>
              <p className="font-semibold">
                {asset.branchId ? `${asset.branchId.branchName} (${asset.branchId.branchCode})` : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-semibold">{asset.location}</p>
            </div>
            {asset.purchaseDate && (
              <div>
                <p className="text-sm text-muted-foreground">Purchase Date</p>
                <p className="font-semibold">{dayjs(asset.purchaseDate).format('DD/MM/YYYY')}</p>
              </div>
            )}
            {asset.purchasePrice && (
              <div>
                <p className="text-sm text-muted-foreground">Purchase Price</p>
                <p className="font-semibold">₹{asset.purchasePrice.toLocaleString()}</p>
              </div>
            )}
            {asset.warrantyExpiry && (
              <div>
                <p className="text-sm text-muted-foreground">Warranty Expiry</p>
                <p className="font-semibold">{dayjs(asset.warrantyExpiry).format('DD/MM/YYYY')}</p>
              </div>
            )}
          </div>
          {asset.notes && (
            <div className="mt-3">
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="font-semibold">{asset.notes}</p>
            </div>
          )}
        </div>
      ),
    });
  };

  const columns = [
    {
      title: "Asset Name",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: Asset) => (
        <div className="flex items-center gap-3">
          {record.image && (
            <img 
              src={record.image} 
              alt={text}
              className="w-10 h-10 object-cover rounded"
            />
          )}
          <span className="font-semibold">{text}</span>
        </div>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
    },
    {
      title: "Asset Category",
      dataIndex: ["assetTypeId", "name"],
      key: "assetType",
      render: (text: string) => text || "N/A",
    },
    {
      title: "Serial Number",
      dataIndex: "serialNumber",
      key: "serialNumber",
      render: (text: string) => text || "N/A",
    },
    {
      title: "Location",
      dataIndex: "location",
      key: "location",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (text: string) => {
        const statusColors: Record<string, string> = {
          "Working": "bg-green-100 text-green-700",
          "Under Maintenance": "bg-yellow-100 text-yellow-700",
          "Damaged": "bg-red-100 text-red-700",
          "Retired": "bg-gray-100 text-gray-700",
        };
        return (
          <Badge className={`px-2 py-1 rounded text-sm font-medium ${statusColors[text] || "bg-gray-100 text-gray-700"}`}>
            {text}
          </Badge>
        );
      },
      align: "center" as const,
    },
    {
      title: "Action",
      key: "action",
      align: "center" as const,
      render: (_: any, record: Asset) => (
        <div className="flex justify-center">
          <button
            onClick={() => handleViewDetails(record)}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4 text-blue-600" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <MainLayout>
      <main className="p-4 space-y-6">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">My Assets</h1>
          </div>
        </div>

        {/* STATUS TABS */}
        <Tabs activeKey={tabKey} onChange={handleTabChange}>
          <TabPane tab={`All Assets (${filteredAssets.length})`} key="all" />
          <TabPane tab="Working" key="working" />
          <TabPane tab="Under Maintenance" key="maintenance" />
          <TabPane tab="Damaged" key="damaged" />
          <TabPane tab="Retired" key="retired" />
        </Tabs>

        {/* TABLE */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Assigned Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table
                dataSource={filteredAssets}
                columns={columns}
                rowKey={(record) => record._id}
                loading={isLoading}
                pagination={false}
                locale={{ emptyText: "No assets assigned to you" }}
                scroll={{ x: 'max-content' }}
                size="middle"
              />
            </div>

            {tabKey === "all" && totalAssets > pageSize && (
              <div className="flex justify-end pt-6">
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={totalAssets}
                  showSizeChanger
                  showTotal={(total) => `Total ${total} assets`}
                  onChange={(page, size) => {
                    setCurrentPage(page);
                    setPageSize(size);
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </MainLayout>
  );
};

export default EmployeeAssets;
