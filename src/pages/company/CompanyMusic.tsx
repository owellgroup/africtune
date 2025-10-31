import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable, { Column, Action } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { companyAPI } from '@/services/api';
import MusicPlayerDialog from '@/components/common/MusicPlayerDialog';
import VideoPlayerDialog from '@/components/common/VideoPlayerDialog';
import { ArtistWork } from '@/types';
import { Play, Download, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const CompanyMusic: React.FC = () => {
  const [music, setMusic] = useState<ArtistWork[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [playerOpen, setPlayerOpen] = useState(false);
  const [playerTrack, setPlayerTrack] = useState<{ id: number; title: string; artist?: string; fileUrl: string; fileType?: string } | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoTrack, setVideoTrack] = useState<{ id: number; title: string; artist?: string; fileUrl: string; fileType?: string } | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [mediaTab, setMediaTab] = useState<'all' | 'audio' | 'video'>('all');
  const isVideo = (m: ArtistWork) => {
    const ft = (m.fileType || '').toLowerCase();
    const url = (m.fileUrl || '').toLowerCase();
    return ft.startsWith('video') || /(\.mp4|\.mov|\.avi|\.mkv|\.webm)$/.test(url);
  };
  const playAtIndex = (idx: number) => {
    const m = filteredMusic[idx];
    if (!m) return;
    const overallIndex = music.findIndex(mm => mm.id === m.id);
    setCurrentIndex(overallIndex);
    if (isVideo(m)) {
      setVideoTrack({ id: m.id, title: m.title, artist: m.artist, fileUrl: m.fileUrl, fileType: m.fileType });
      setVideoOpen(true);
      setPlayerOpen(false);
    } else {
      setPlayerTrack({ id: m.id, title: m.title, artist: m.artist, fileUrl: m.fileUrl, fileType: m.fileType });
      setPlayerOpen(true);
      setVideoOpen(false);
    }
  };
  const navigate = useNavigate();

  // derive filtered list based on tab
  const filteredMusic = mediaTab === 'all' ? music : mediaTab === 'video' ? music.filter(m => isVideo(m)) : music.filter(m => !isVideo(m));

  useEffect(() => {
    const loadMusic = async () => {
      try {
        setLoading(true);
        const data = await companyAPI.getApprovedMusic();
        setMusic(data);
      } catch (error) {
        console.error('Failed to load music:', error);
        toast({
          title: "Error",
          description: "Failed to load music library",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadMusic();

    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key !== 'namsa:update') return;
      try {
        const payload = JSON.parse(e.newValue || '{}');
        if (payload?.type === 'music') {
          loadMusic();
        }
      } catch (err) {}
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [toast]);

  const columns: Column<ArtistWork>[] = [
    {
      key: 'title',
      header: 'Title',
      accessor: 'title',
      className: 'font-medium',
    },
    {
      key: 'isrcCode',
      header: 'ISRC',
      accessor: (r) => (r as any).isrc_code || '-',
    },
    {
      key: 'artist',
      header: 'Artist',
      accessor: 'artist',
    },
    {
      key: 'artistWorkType',
      header: 'Genre',
      accessor: (item) => item.artistWorkType?.workTypeName || '-',
    },
    {
      key: 'albumName',
      header: 'Album',
      accessor: 'albumName',
    },
    {
      key: 'mediaType',
      header: 'Type',
      accessor: (item) => isVideo(item) ? 'Video' : 'Audio',
    },
    {
      key: 'duration',
      header: 'Duration',
      accessor: 'duration',
      render: (value) => value || 'N/A',
    },
    {
      key: 'uploadedDate',
      header: 'Release Date',
      accessor: 'uploadedDate',
      render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A',
    },

    {
      key: 'status',
      header: 'Status',
      accessor: 'status',
      render: (value) => (
        <Badge variant="default" className="bg-namsa-success text-white">
          {(value as any)?.statusName || (value as any)?.status || 'Approved'}
        </Badge>
      ),
    },
  ];

  const actions: Action<ArtistWork>[] = [
    {
      label: 'Play',
      icon: Play,
      onClick: (musicItem) => {
        if (!musicItem.fileUrl) {
          toast({ title: 'Media Not Available', description: 'No media file available for this track', variant: 'destructive' });
          return;
        }
        const idx = filteredMusic.findIndex(m => m.id === musicItem.id);
        playAtIndex(Math.max(0, idx));
      },
    },
    {
      label: 'Download',
      icon: Download,
      onClick: (music) => {
        if (music.fileUrl) {
          const link = document.createElement('a');
          link.href = music.fileUrl;
          link.download = `${music.title}.${music.fileType || 'mp3'}`;
          link.click();
        } else {
          toast({
            title: "Download Not Available",
            description: "No audio file available for download",
            variant: "destructive",
          });
        }
      },
    },
  ];

  return (
    <DashboardLayout title="Music Library">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Music Library</h1>
            <p className="text-muted-foreground">
              Browse and manage approved music tracks
            </p>
          </div>
          <Button onClick={() => navigate('/company/logsheet/create')} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Log Sheet
          </Button>
        </div>

        <Tabs value={mediaTab} onValueChange={(v) => setMediaTab(v as any)}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="audio">Audio</TabsTrigger>
            <TabsTrigger value="video">Videos</TabsTrigger>
          </TabsList>
        </Tabs>

        <DataTable
          data={filteredMusic}
          columns={columns}
          actions={actions}
          loading={loading}
          searchable={true}
          emptyMessage="No approved music available"
        />
        <MusicPlayerDialog
          open={playerOpen}
          onOpenChange={setPlayerOpen}
          track={playerTrack}
          onPrev={() => {
            const id = playerTrack?.id;
            if (!id) return undefined;
            const idx = filteredMusic.findIndex(m => m.id === id);
            if (idx > 0) return playAtIndex(idx - 1);
            return undefined;
          }}
          onNext={() => {
            const id = playerTrack?.id;
            if (!id) return undefined;
            const idx = filteredMusic.findIndex(m => m.id === id);
            if (idx < filteredMusic.length - 1) return playAtIndex(idx + 1);
            return undefined;
          }}
        />
        <VideoPlayerDialog
          open={videoOpen}
          onOpenChange={setVideoOpen}
          track={videoTrack as any}
          onPrev={() => {
            const id = videoTrack?.id;
            if (!id) return undefined;
            const idx = filteredMusic.findIndex(m => m.id === id);
            if (idx > 0) return playAtIndex(idx - 1);
            return undefined;
          }}
          onNext={() => {
            const id = videoTrack?.id;
            if (!id) return undefined;
            const idx = filteredMusic.findIndex(m => m.id === id);
            if (idx < filteredMusic.length - 1) return playAtIndex(idx + 1);
            return undefined;
          }}
        />
      </div>
    </DashboardLayout>
  );
};

export default CompanyMusic;
