import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { companyAPI } from '@/services/api';
import { LogSheet, ArtistWork } from '@/types';
import { ArrowLeft, FileMusic, Video, Play } from 'lucide-react';
import MusicPlayerDialog from '@/components/common/MusicPlayerDialog';
import VideoPlayerDialog from '@/components/common/VideoPlayerDialog';

const CompanyLogSheetDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [logSheet, setLogSheet] = useState<LogSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTrack, setCurrentTrack] = useState<ArtistWork | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

  useEffect(() => {
    const loadLogSheet = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await companyAPI.getLogSheetById(parseInt(id));
        setLogSheet(data);
      } catch (error) {
        console.error('Failed to load log sheet:', error);
        toast({
          title: "Error",
          description: "Failed to load log sheet details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadLogSheet();
  }, [id, toast]);

  const isVideo = (track: ArtistWork) => {
    const ft = (track.fileType || '').toLowerCase();
    return ft.includes('video') || ft.includes('mp4') || ft.includes('mov');
  };

  const handlePlayClick = (track: ArtistWork) => {
    setCurrentTrack(track);
    if (isVideo(track)) {
      setVideoOpen(true);
    } else {
      setPlayerOpen(true);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Log Sheet Details">
        <div className="p-6">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!logSheet) {
    return (
      <DashboardLayout title="Log Sheet Details">
        <div className="p-6">Log sheet not found</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Log Sheet Details">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/company/logsheets')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Log Sheets
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{logSheet.title}</h1>
            <p className="text-muted-foreground">
              Created on {new Date(logSheet.createdDate).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Log Sheet Details */}
        <Card>
          <CardHeader>
            <CardTitle>Log Sheet Information</CardTitle>
            <CardDescription>Details about this log sheet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Company</div>
                <div className="font-semibold">{logSheet.company?.companyName || 'Unknown Company'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Contact Person</div>
                <div className="font-semibold">{logSheet.company?.contactPerson || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Email</div>
                <div className="font-semibold">{logSheet.company?.companyEmail || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Phone</div>
                <div className="font-semibold">{logSheet.company?.companyPhone || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Address</div>
                <div className="font-semibold">{logSheet.company?.companyAddress || 'N/A'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Music */}
        <Card>
          <CardHeader>
            <CardTitle>Selected Music</CardTitle>
            <CardDescription>
              Music tracks included in this log sheet ({logSheet.selectedMusic?.length || 0} tracks)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {logSheet.selectedMusic && logSheet.selectedMusic.length > 0 ? (
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="h-10 px-4 text-left font-medium">Title</th>
                        <th className="h-10 px-4 text-left font-medium">Artist</th>
                    
                        <th className="h-10 px-4 text-center font-medium">Type</th>
                        <th className="h-10 px-4 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logSheet.selectedMusic.map((track) => (
                        <tr key={track.id} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-4">{track.title}</td>
                          <td className="p-4">{track.artist || track.groupOrBandOrStageName || 'Unknown Artist'}</td>
                      
                          <td className="p-4 text-center">
                            {isVideo(track) ? (
                              <Video className="h-4 w-4 inline-block" />
                            ) : (
                              <FileMusic className="h-4 w-4 inline-block" />
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePlayClick(track)}
                              className="gap-2"
                            >
                              <Play className="h-4 w-4" />
                              Play
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No music tracks selected for this log sheet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Media Players */}
        <MusicPlayerDialog
          open={playerOpen}
          onOpenChange={setPlayerOpen}
          track={currentTrack}
        />
        <VideoPlayerDialog
          open={videoOpen}
          onOpenChange={setVideoOpen}
          track={currentTrack}
        />
      </div>
    </DashboardLayout>
  );
};

export default CompanyLogSheetDetails;