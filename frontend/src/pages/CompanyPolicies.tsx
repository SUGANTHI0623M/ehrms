import { useState } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, Modal, Select, Upload, Pagination } from "antd";
import { Plus, MoreHorizontal } from "lucide-react";
import { Dropdown, Menu } from "antd";

const CompanyPolicies = () => {
    const [search, setSearch] = useState("");
    const [openAddModal, setOpenAddModal] = useState(false);

    const [policies] = useState([
        {
            id: 1,
            location: "Head Office",
            title: "Office Tour Agreement December 2025",
            description: "Office Tour Agreement",
        },
    ]);

    const filteredPolicies = policies.filter((item) =>
        item.title.toLowerCase().includes(search.toLowerCase())
    );

    const MoreOutlinedDropdown = ({ record }: { record: any }) => {
        const items = [
            { key: "edit", label: "✏️ Edit" },
            { key: "delete", label: "🗑 Delete" },
            { key: "print", label: "🖨 Print" },
            { key: "download", label: "⬇ Download" },
        ];

        return (
            <Dropdown menu={{ items }} trigger={["click"]} placement="bottomRight">
                <Button size="sm" className="text-white p-2">
                    <MoreHorizontal size={18} />
                </Button>
            </Dropdown>
        );
    };

    const columns = [
        {
            title: "Location",
            dataIndex: "location",
            render: (text: string) => <span className="font-medium">{text}</span>,
        },
        { title: "Title", dataIndex: "title" },
        { title: "Description", dataIndex: "description" },
        {
            title: "Action",
            align: "center",
            render: (_: any, record: any) => (
                <div className="flex justify-center">
                    <MoreOutlinedDropdown record={record} />
                </div>
            ),
        },
    ];

    return (
        <MainLayout>
            <main className="p-4 space-y-6">

                {/* 🔹 TOP HEADER */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <h1 className="text-3xl font-bold">Company Policies</h1>

                    <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                        <Button
                            className="text-white w-full sm:w-auto"
                            onClick={() => setOpenAddModal(true)}
                        >
                            <Plus className="mr-1" size={18} /> Add New Company Policy
                        </Button>

                        <Select
                            placeholder="Select Location..."
                            className="min-w-[200px]"
                            allowClear
                        />

                        <Input
                            placeholder="Search By Title"
                            className="w-full sm:w-60"
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* 🔹 TABLE DISPLAY */}
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold">Policies</CardTitle>
                    </CardHeader>

                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table
                                dataSource={filteredPolicies}
                                columns={columns}
                                pagination={false}
                                rowKey="id"
                            />
                        </div>

                        <div className="flex justify-end pt-4">
                            <Pagination total={15} defaultPageSize={10} />
                        </div>
                    </CardContent>
                </Card>

                {/* 🔹 ADD NEW POLICY MODAL */}
                <Modal
                    centered
                    open={openAddModal}
                    onCancel={() => setOpenAddModal(false)}
                    footer={null}
                    width={950}
                >
                    <h2 className="text-xl font-bold mb-4">Add New Company Policy</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* Location */}
                        <div className="flex gap-2">
                            <Select placeholder="Select Location..." className="w-full" />
                            <Button className="text-white">+</Button>
                        </div>

                        {/* Title */}
                        <Input placeholder="Please Enter Title" />

                        {/* Description */}
                        <div className="col-span-1 md:col-span-2">
                            <textarea
                                placeholder="Please Enter Description"
                                className="border rounded w-full min-h-[130px] p-2"
                            />
                        </div>
                    </div>

                    {/* File Upload */}
                    <div className="mt-6">
                        <p className="font-medium mb-2">Policy Document</p>
                        <Upload>
                            <Button className="border px-4">Upload</Button>
                        </Upload>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 mt-8">
                        <Button variant="outline" onClick={() => setOpenAddModal(false)}>
                            Cancel
                        </Button>
                        <Button className="text-white">Create</Button>
                    </div>
                </Modal>
            </main>
        </MainLayout>
    );
};

export default CompanyPolicies;
