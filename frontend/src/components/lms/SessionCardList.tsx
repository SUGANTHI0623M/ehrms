import React from 'react';
import { Card, Empty, Skeleton } from 'antd';

export interface SessionCardListProps<T = any> {
    list: T[];
    getItemId: (item: T) => string;
    expandedIds: Set<string>;
    onToggleExpand: (id: string) => void;
    columnHeaders: React.ReactNode;
    renderCardHeader: (item: T, isExpanded: boolean) => React.ReactNode;
    renderCardBody: (item: T) => React.ReactNode;
    emptyPrimary?: string;
    emptySecondary?: string;
    loading?: boolean;
    wrapperClassName?: string;
}

/**
 * Shared expandable card list UI used by:
 * - Employee Live Sessions
 * - Admin Live Sessions
 * - Admin Assessment Management
 *
 * Same wrapper, column header bar, card style, and expand/collapse behavior for UI consistency.
 */
function SessionCardList<T = any>({
    list,
    getItemId,
    expandedIds,
    onToggleExpand,
    columnHeaders,
    renderCardHeader,
    renderCardBody,
    emptyPrimary = 'No items.',
    emptySecondary = 'Items will appear here.',
    loading = false,
    wrapperClassName = ''
}: SessionCardListProps<T>) {
    if (loading) {
        return (
            <div className="session-cards-list">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="session-card-skeleton" style={{ marginBottom: 16 }}>
                        <Skeleton active paragraph={{ rows: 2 }} />
                    </Card>
                ))}
            </div>
        );
    }

    if (list.length === 0) {
        return (
            <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                    <div className="text-center">
                        <div className="text-base font-medium text-gray-700">{emptyPrimary}</div>
                        <div className="text-sm text-gray-500 mt-1">{emptySecondary}</div>
                    </div>
                }
                className="py-12"
            />
        );
    }

    const wrapperClass = wrapperClassName
        ? `session-cards-wrapper ${wrapperClassName}`.trim()
        : 'session-cards-wrapper';

    return (
        <div className={wrapperClass}>
            <div className="session-cards-column-header session-card-header-grid">
                {columnHeaders}
            </div>
            <div className="session-cards-list">
                {list.map((item) => {
                    const id = getItemId(item);
                    const isExpanded = expandedIds.has(id);
                    return (
                        <Card
                            key={id}
                            className={`session-card ${isExpanded ? 'session-card-expanded' : ''}`}
                            hoverable
                            bordered
                            onClick={() => onToggleExpand(id)}
                        >
                            <div className="session-card-header session-card-header-grid">
                                {renderCardHeader(item, isExpanded)}
                            </div>
                            <div className={`session-card-body-wrapper ${isExpanded ? 'session-card-body-expanded' : ''}`}>
                                <div className="session-card-body">
                                    {renderCardBody(item)}
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

export default SessionCardList;
