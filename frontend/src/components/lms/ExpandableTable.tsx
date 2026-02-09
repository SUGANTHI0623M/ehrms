import React, { useState, useCallback } from 'react';
import { Table } from 'antd';
import type { TableProps } from 'antd';
import { CaretRightOutlined } from '@ant-design/icons';

export interface ExpandableTableProps<T> extends Omit<TableProps<T>, 'expandable'> {
    /** Custom content rendered when row is expanded */
    expandedRowRender: (record: T) => React.ReactNode;
    /** Only one row expanded at a time (accordion mode). Default true */
    accordion?: boolean;
    /** Optional class for the expanded panel wrapper */
    expandedPanelClassName?: string;
    /** Controlled expanded row keys (enables parent to know which row is expanded) */
    expandedRowKeys?: React.Key[];
    /** Called when expanded rows change (use with expandedRowKeys for controlled mode) */
    onExpandedRowsChange?: (keys: React.Key[]) => void;
}

function ExpandableTable<T extends object>({
    expandedRowRender,
    accordion = true,
    expandedPanelClassName = '',
    rowKey,
    dataSource = [],
    ...tableProps
}: ExpandableTableProps<T>) {
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

    const getRowKey = useCallback(
        (record: T): React.Key => {
            if (typeof rowKey === 'function') return rowKey(record);
            if (typeof rowKey === 'string') return (record as any)[rowKey];
            return (record as any).key ?? (record as any)._id ?? (record as any).id;
        },
        [rowKey]
    );

    const onExpand = useCallback(
        (expanded: boolean, record: T) => {
            const key = getRowKey(record);
            if (accordion) {
                setExpandedRowKeys(expanded ? [key] : []);
            } else {
                setExpandedRowKeys((prev: React.Key[]) =>
                    expanded ? [...prev, key] : prev.filter((k) => k !== key)
                );
            }
        },
        [accordion, getRowKey, setExpandedRowKeys]
    );

    const expandable: TableProps<T>['expandable'] = {
        expandedRowRender: (record) => (
            <div
                className={`p-4 bg-gray-50/80 rounded-b-lg border-t border-gray-100 ${expandedPanelClassName}`}
                onClick={(e) => e.stopPropagation()}
            >
                {expandedRowRender(record)}
            </div>
        ),
        expandedRowKeys,
        onExpand,
        expandIcon: ({ expanded, onExpand: onExpandIcon, record }) => (
            <span
                className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 transition-colors cursor-pointer text-gray-400 hover:text-primary"
                onClick={(e) => {
                    e.stopPropagation();
                    onExpandIcon(record, e as any);
                }}
            >
                <CaretRightOutlined
                    style={{ transition: 'transform 0.2s' }}
                    rotate={expanded ? 90 : 0}
                />
            </span>
        ),
        rowExpandable: () => true,
        expandRowByClick: true
    };

    return (
        <Table<T>
            {...tableProps}
            className={[tableProps.className, 'lms-expandable-table'].filter(Boolean).join(' ')}
            rowKey={rowKey as any}
            dataSource={dataSource}
            expandable={expandable}
        />
    );
}

export default ExpandableTable;
