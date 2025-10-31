import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable, { Column, Action } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { adminAPI } from '@/services/api';
import MusicPlayerDialog from '@/components/common/MusicPlayerDialog';
import VideoPlayerDialog from '@/components/common/VideoPlayerDialog';
import { ArtistWork } from '@/types';
import { Play, Download, CheckCircle, Clock, XCircle, Eye } from 'lucide-react';
import { getMediaTypeLabel, resolveMediaType } from '@/utils/mediaUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

const AdminAllMusic: React.FC = () => {
  const [music, setMusic] = useState<ArtistWork[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [playerOpen, setPlayerOpen] = useState(false);
  const [playerTrack, setPlayerTrack] = useState<{ id: number; title: string; artist?: string; fileUrl: string; fileType?: string } | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoTrack, setVideoTrack] = useState<{ id: number; title: string; artist?: string; fileUrl: string; fileType?: string } | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<ArtistWork | null>(null);

  useEffect(() => {
    const loadMusic = async () => {
      try {
        setLoading(true);
        const data = await adminAPI.getAllMusic();
        setMusic(data);
      } catch (error) {
        console.error('Load music error:', error);
        toast({
          title: 'Error',
          description: 'Failed to load music',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    loadMusic();
  }, [toast]);
  
  // Listen for status updates pushed to localStorage (same pattern as ArtistMyMusic)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key !== 'namsa:update') return;
      try {
        const payload = JSON.parse(e.newValue || '{}');
        if (payload?.type === 'music') {
          adminAPI.getAllMusic().then((data) => setMusic(data)).catch(() => {});
          toast({ title: 'Music Status Updated', description: 'A music status was updated.' });
        }
      } catch (err) {}
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [toast]);

  const playAtIndex = (idx: number) => {
    if (!music.length || idx < 0 || idx >= music.length) {
      toast({
        title: 'Track Not Available',
        description: 'Unable to locate the selected track in the list.',
        variant: 'destructive',
      });
      return;
    }

    const target = music[idx];
    if (!target?.fileUrl) {
      toast({
        title: 'Media Not Available',
        description: 'No media file available for this track',
        variant: 'destructive',
      });
      return;
    }

    setCurrentIndex(idx);
    const mediaType = resolveMediaType(target.fileType, target.fileUrl, target.artistUploadType?.typeName);

    if (mediaType === 'video') {
      setVideoTrack({ id: target.id, title: target.title, artist: target.artist, fileUrl: target.fileUrl, fileType: target.fileType });
      setVideoOpen(true);
      setPlayerOpen(false);
      return;
    }

    if (mediaType === 'audio') {
      setPlayerTrack({ id: target.id, title: target.title, artist: target.artist, fileUrl: target.fileUrl, fileType: target.fileType });
      setPlayerOpen(true);
      setVideoOpen(false);
      return;
    }

    toast({
      title: 'Unsupported Media',
      description: 'Unable to determine media type for this track',
      variant: 'destructive',
    });
  };

  const formatDuration = (duration: string | number | null | undefined) => {
    if (duration === null || duration === undefined || duration === '') return '-';
    if (typeof duration === 'number' && Number.isFinite(duration)) {
      const minutes = Math.floor(duration / 60);
      const seconds = Math.round(duration % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    if (typeof duration === 'string') {
      const numeric = Number(duration);
      if (!Number.isNaN(numeric)) {
        const minutes = Math.floor(numeric / 60);
        const seconds = Math.round(numeric % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
      return duration;
    }
    return String(duration);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-namsa-success text-white"><CheckCircle className="w-3 h-3 mr-1" />APPROVED</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />REJECTED</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />PENDING</Badge>;
    }
  };

  const handleViewMusic = (item: ArtistWork) => {
    setSelectedMusic(item);
    setViewDialogOpen(true);
  };

  const handlePlaySelected = () => {
    if (!selectedMusic) return;
    const idx = music.findIndex((m) => m.id === selectedMusic.id);
    if (idx >= 0) {
      playAtIndex(idx);
    } else {
      toast({ title: 'Track Not Available', description: 'The selected track could not be found in the current list.', variant: 'destructive' });
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setViewDialogOpen(open);
    if (!open) {
      setSelectedMusic(null);
    }
  };

  const handleDownloadSelected = () => {
    if (!selectedMusic?.fileUrl) {
      toast({ title: 'Download Not Available', description: 'No media file available for download', variant: 'destructive' });
      return;
    }
    const link = document.createElement('a');
    link.href = selectedMusic.fileUrl;
    link.download = `${selectedMusic.title}.${selectedMusic.fileType || 'mp3'}`;
    link.click();
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'number' && Number.isFinite(value)) return value.toString();
    return String(value);
  };

  const renderInfoGrid = (items: { label: string; value: string }[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <div key={item.label}>
          <Label>{item.label}</Label>
          <Input value={item.value || '-'} disabled />
        </div>
      ))}
    </div>
  );

  const columns: Column<ArtistWork>[] = [
    { key: 'title', header: 'Title', accessor: 'title', className: 'font-medium' },
    { key: 'artist', header: 'Artist', accessor: 'artist' },
    { key: 'artistWorkType', header: 'Genre', accessor: (item) => item.artistWorkType?.workTypeName || '-' },
    { key: 'albumName', header: 'Album', accessor: 'albumName' },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => (row as any)?.status?.statusName || (row as any)?.status?.status || 'PENDING',
      render: (value) => getStatusBadge(String(value || 'PENDING'))
    },
    { key: 'isrcCode', header: 'ISRC', accessor: (r) => (r as any).isrc_code || '-' },
    {
      key: 'mediaType',
      header: 'Type',
      accessor: (item) => getMediaTypeLabel(item.fileType, item.fileUrl),
      render: (_value, item) => {
        const resolvedType = resolveMediaType(item.fileType, item.fileUrl, item.artistUploadType?.typeName);
        const label = getMediaTypeLabel(item.fileType, item.fileUrl, item.artistUploadType?.typeName);

        return (
          <span className="flex items-center gap-1">
            <Play
              className={`h-4 w-4 ${
                resolvedType === 'video'
                  ? 'text-blue-500'
                  : resolvedType === 'audio'
                  ? 'text-green-500'
                  : 'text-muted-foreground'
              }`}
            />
            {label}
          </span>
        );
      }
    },
    { key: 'actions', header: 'Actions', accessor: undefined, render: (_value, item) => (
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const idx = music.findIndex((m) => m.id === item.id);
            if (idx >= 0) {
              playAtIndex(idx);
            } else {
              toast({ title: 'Track Not Available', description: 'Unable to locate this track in the current list.', variant: 'destructive' });
            }
          }}
        >
          <Play className="h-4 w-4 mr-1" />
          Play
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
          if (item.fileUrl) {
            const link = document.createElement('a');
            link.href = item.fileUrl;
            link.download = `${item.title}.${item.fileType || 'mp3'}`;
            link.click();
          } else {
            toast({ title: 'Download Not Available', description: 'No audio file available for download', variant: 'destructive' });
          }
        }}>
          <Download className="h-4 w-4 mr-1" />
          Download
        </Button>
      </div>
    ) },
  ];

  const actions: Action<ArtistWork>[] = [
    {
      label: 'View',
      icon: Eye,
      onClick: (musicItem) => {
        handleViewMusic(musicItem);
      },
    },
    {
      label: 'Play',
      icon: Play,
      onClick: (musicItem) => {
        if (!musicItem.fileUrl) {
          toast({ title: 'Media Not Available', description: 'No media file available for this track', variant: 'destructive' });
          return;
        }
        const idx = music.findIndex(m => m.id === musicItem.id);
        if (idx >= 0) {
          playAtIndex(idx);
        } else {
          toast({ title: 'Track Not Available', description: 'Unable to locate this track in the current list.', variant: 'destructive' });
        }
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
    <DashboardLayout title="All Music">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">All Music</h1>
        <DataTable
          data={music}
          columns={columns}
          actions={actions}
          loading={loading}
          searchable={true}
          emptyMessage="No music available"
        />
        <Dialog open={viewDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Music Details</DialogTitle>
            </DialogHeader>
            {selectedMusic ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Track Information</h3>
                  {renderInfoGrid([
                    { label: 'Title', value: formatValue(selectedMusic.title) },
                    { label: 'Artist', value: formatValue(selectedMusic.artist) },
                    { label: 'Album', value: formatValue(selectedMusic.albumName) },
                    { label: 'Duration', value: formatDuration(selectedMusic.duration as any) },
                    { label: 'Media Type', value: getMediaTypeLabel(selectedMusic.fileType, selectedMusic.fileUrl) },
                    { label: 'Upload Date', value: selectedMusic.uploadedDate ? new Date(selectedMusic.uploadedDate).toLocaleDateString() : '-' },
                  ])}
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Metadata</h3>
                  {renderInfoGrid([
                    { label: 'ISRC Code', value: formatValue((selectedMusic as any).isrc_code || selectedMusic.isrcCode) },
                    { label: 'Work ID', value: formatValue(selectedMusic.workId) },
                    { label: 'Genre', value: formatValue(selectedMusic.artistWorkType?.workTypeName) },
                    { label: 'Upload Type', value: formatValue(selectedMusic.artistUploadType?.typeName) },
                    { label: 'Country', value: formatValue(selectedMusic.country) },
                    { label: 'Duration (Raw)', value: formatValue(selectedMusic.duration) },
                  ])}
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Uploader Information</h3>
                  {renderInfoGrid([
                    { label: 'Uploaded By', value: formatValue(selectedMusic.user?.email) },
                    { label: 'Artist ID', value: formatValue((selectedMusic as any).artistId || (selectedMusic as any).ArtistId) },
                  ])}
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Creative Credits</h3>
                  {renderInfoGrid([
                    { label: 'Composer', value: formatValue(selectedMusic.composer) },
                    { label: 'Author', value: formatValue(selectedMusic.author) },
                    { label: 'Arranger', value: formatValue(selectedMusic.arranger) },
                    { label: 'Producer', value: formatValue(selectedMusic.producer) },
                    { label: 'Publisher', value: formatValue(selectedMusic.publisher) },
                    { label: 'Label', value: formatValue(selectedMusic.labelName) },
                  ])}
                </div>

                {(() => {
                  const notesRaw = selectedMusic.notes ?? (selectedMusic as any).description;
                  const notesValue = notesRaw ? (typeof notesRaw === 'string' ? notesRaw : formatValue(notesRaw)) : '';
                  if (!notesValue) return null;
                  return (
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea value={notesValue} disabled rows={4} />
                    </div>
                  );
                })()}

                <div>
                  <h3 className="text-lg font-semibold mb-4">Playback & Actions</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handlePlaySelected} className="gap-2">
                      <Play className="h-4 w-4" />
                      Play
                    </Button>
                    <Button variant="outline" onClick={handleDownloadSelected} className="gap-2">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Select a track to view its details.</p>
            )}
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Audio Player Dialog - Placed outside main content */}
      <MusicPlayerDialog
        open={playerOpen}
        onOpenChange={setPlayerOpen}
        track={playerTrack}
        onPrev={() => (currentIndex > 0 ? playAtIndex(currentIndex - 1) : undefined)}
        onNext={() => (currentIndex >= 0 && currentIndex < music.length - 1 ? playAtIndex(currentIndex + 1) : undefined)}
      />
      
      {/* Video Player Dialog - Placed outside main content */}
      <VideoPlayerDialog
        open={videoOpen}
        onOpenChange={setVideoOpen}
        track={videoTrack as any}
        onPrev={() => (currentIndex > 0 ? playAtIndex(currentIndex - 1) : undefined)}
        onNext={() => (currentIndex >= 0 && currentIndex < music.length - 1 ? playAtIndex(currentIndex + 1) : undefined)}
      />
    </DashboardLayout>
  );
};

export default AdminAllMusic;
