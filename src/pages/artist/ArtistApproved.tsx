import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable, { Column } from '@/components/common/DataTable';
import { artistAPI } from '@/services/api';
import { ArtistWork } from '@/types';

const ArtistApproved: React.FC = () => {
  const [rows, setRows] = useState<ArtistWork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const all = await artistAPI.getMyMusic().catch(() => []);
        setRows(all.filter(r => (r.status?.statusName || (r as any).status?.status || '').toLowerCase() === 'approved'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const cols: Column<ArtistWork>[] = [
    { key: 'title', header: 'Title', accessor: 'title' },
    { key: 'duration', header: 'Duration', accessor: 'duration' },
    { key: 'genre', header: 'Genre', accessor: (r) => r.artistWorkType?.workTypeName || '-' },
    { 
      key: 'isrcCode', 
      header: 'ISRC', 
      accessor: (r) => {
        const code = (r as any).isrc_code || (r as any).ISRC_code || r.isrcCode || '-';
        return code;
      }
    },
  ];

  return (
    <DashboardLayout title="Approved Tracks">
      {loading ? (
        <div className="h-32 rounded-xl bg-muted animate-pulse"></div>
      ) : (
        <DataTable
          data={rows}
          columns={cols}
          searchable
          emptyMessage="No approved tracks"
          title="Approved Catalogue"
          description="Tracks that have passed review and are ready for licensing"
          pageSize={8}
        />
      )}
    </DashboardLayout>
  );
};

export default ArtistApproved;
