import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { adminAPI, artistAPI, companyAPI } from '@/services/api';
import { LogSheet, ArtistWork } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import MusicPlayerDialog from '@/components/common/MusicPlayerDialog';
import VideoPlayerDialog from '@/components/common/VideoPlayerDialog';
import { FileMusic, Video, Play } from 'lucide-react';

const ArtistPerformance: React.FC = () => {
  const [myTracks, setMyTracks] = useState<ArtistWork[]>([]);
  const [logSheets, setLogSheets] = useState<LogSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<ArtistWork | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [selectedLogSheet, setSelectedLogSheet] = useState<LogSheet | null>(null);
  const [logSheetDialogOpen, setLogSheetDialogOpen] = useState(false);
  const { toast } = useToast();

  const { user } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
          // Always fetch all logsheets using adminAPI for virtualization and to avoid 403 errors
          const myMusicPromise = artistAPI.getMyMusic().catch(() => []);
          const allLogSheetsPromise = adminAPI.getAllLogSheets().catch(() => []);
          const [myMusic, allLogSheets] = await Promise.all([myMusicPromise, allLogSheetsPromise]);

        // Create set of artist's track IDs and title/artist map for fallback matching
        const myTrackIds = new Set<number>((myMusic as any[]).map((m: any) => m?.id).filter(Boolean));
        const titleArtistToId: Record<string, number> = {};
        const myMusicById: Record<number, any> = {};
        (myMusic as any[]).forEach((m: any) => {
          if (!m) return;
          const id = m.id;
          myMusicById[id] = m;
          const title = (m.title || '').toString().toLowerCase().trim();
          const artistName = (m.artist || m.user?.name || '').toString().toLowerCase().trim();
          const key = `${title}|||${artistName}`;
          if (title) titleArtistToId[key] = id;
        });

        // Helper: normalize a selectedMusic entry into an object with possible id/title/artist/user
        const normalizeMusic = (music: any) => {
          if (music == null) return null;
          // If the sheet stored only numeric ids
          if (typeof music === 'number') return { id: music };
          // If backend returned an object wrapper like { musicId: 123 } or { artistWorkId: 123 }
          const id = music.id || music.musicId || music.artistWorkId || music.workId || music.songId || null;
          const title = music.title || music.name || music.trackTitle || null;
          const artistName = music.artist || music.artistName || music.user?.name || null;
          const userObj = music.user || null;
          return { id, title, artist: artistName, user: userObj, raw: music };
        };

        // Filter logsheets to only those containing this artist's music by id, user, or title+artist mapping
        const filteredSheets = (allLogSheets as any[]).filter((sheet: any) => {
          if (!sheet || !sheet.selectedMusic || !Array.isArray(sheet.selectedMusic)) return false;
          return sheet.selectedMusic.some((music: any) => {
            const norm = normalizeMusic(music);
            if (!norm) return false;
            if (norm.id && myTrackIds.has(norm.id)) return true;
            if (norm.user && user && (norm.user.id === user.id || norm.user.email === user.email)) return true;
            if (norm.title) {
              const key = `${(norm.title || '').toString().toLowerCase().trim()}|||${((norm.artist || '')).toString().toLowerCase().trim()}`;
              if (titleArtistToId[key]) return true;
            }
            return false;
          });
        });

  setMyTracks(myMusic);
  setLogSheets(filteredSheets);
      } catch (err) {
        toast({ title: 'Error', description: 'Failed to load performance data', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();

    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key !== 'namsa:update') return;
      try {
        const payload = JSON.parse(e.newValue || '{}');
        if (payload?.type === 'music' || payload?.type === 'profile') {
          load();
          toast({ title: 'Performance Data Updated' });
        }
      } catch (err) {}
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [toast, user]);

  // Aggregate data exactly like admin panel - song counts, artist counts, company counts
  const {
    songCounts,
    artistCounts,
    companyCounts,
    companySheetsMap,
    companySelectedCountMap,
  } = useMemo(() => {
    // Use string keys because sheets can store music as numbers or objects with different fields
    const songMap: Record<string, { key: string; id?: number | null; title: string; count: number; track?: any; companies: Record<string, number>; artistName?: string }> = {};
    const artistMap: Record<string, { name: string; count: number }> = {};
    const companyMap: Record<string, { sheets: number; selectedMusic: number }> = {};
    const companySheetsMap: Record<string, LogSheet[]> = {};

    for (const sheet of logSheets) {
      const companyName = sheet.company?.companyName || 'Unknown Company';
      companyMap[companyName] = companyMap[companyName] || { sheets: 0, selectedMusic: 0 };
      companyMap[companyName].sheets += 1;
      companySheetsMap[companyName] = companySheetsMap[companyName] || [];
      companySheetsMap[companyName].push(sheet);

      for (const m of sheet.selectedMusic || []) {
        // normalize possible shapes: number, { id }, { musicId }, nested { music: { id } }
        const asAny = m as any;
        const maybeId = typeof asAny === 'number'
          ? asAny
          : asAny?.id ?? asAny?.musicId ?? asAny?.artistWorkId ?? asAny?.workId ?? asAny?.songId ?? asAny?.music?.id ?? null;

        const title = asAny?.title || asAny?.name || asAny?.trackTitle || asAny?.music?.title || (maybeId ? `Track ${maybeId}` : 'Unknown Title');
        const artistName = asAny?.user?.name || asAny?.artist || asAny?.artistName || asAny?.music?.artist || asAny?.user?.email || 'Unknown Artist';

        // key uniquely identifies a song entry even if id is missing
        const key = maybeId ? `id:${maybeId}` : `title:${String(title).toLowerCase().trim()}|||${String(artistName).toLowerCase().trim()}`;

        if (!songMap[key]) songMap[key] = { key, id: maybeId, title: title || `Track`, count: 0, track: asAny, companies: {}, artistName };
        songMap[key].count += 1;
        songMap[key].companies[companyName] = (songMap[key].companies[companyName] || 0) + 1;

        const artistKey = songMap[key].artistName || artistName;
        artistMap[artistKey] = artistMap[artistKey] || { name: artistKey, count: 0 };
        artistMap[artistKey].count += 1;

        companyMap[companyName].selectedMusic += 1;
      }
    }

    return {
      songCounts: Object.values(songMap).map((v) => ({ id: v.id ?? v.key, title: v.title, count: v.count, companies: v.companies, artistName: v.artistName, track: v.track })),
      artistCounts: Object.entries(artistMap).map(([k, v]) => ({ name: v.name, count: v.count })),
      companyCounts: Object.entries(companyMap).map(([company, v]) => ({ company, sheets: v.sheets, selectedMusic: v.selectedMusic })),
      companySheetsMap,
      companySelectedCountMap: Object.fromEntries(Object.entries(companyMap).map(([c, v]) => [c, v.selectedMusic])) as Record<string, number>,
    } as any;
  }, [logSheets]);

  const tracksList = useMemo(() => {
    const list = songCounts.map((s: any) => ({ id: s.id, title: s.title }));
    return list.sort((a: any, b: any) => a.title.localeCompare(b.title));
  }, [songCounts]);

  const filteredTracks = useMemo(() => {
    if (!search.trim()) return tracksList;
    const q = search.toLowerCase();
    return tracksList.filter((t: any) => t.title.toLowerCase().includes(q));
  }, [tracksList, search]);

  const selectedCompanyData = useMemo(() => {
    if (!selectedTrackId) return [] as { company: string; count: number }[];
    const map: Record<string, number> = {};
    for (const sheet of logSheets) {
      const companyName = sheet.company?.companyName || 'Unknown Company';
      for (const m of sheet.selectedMusic || []) {
        const id = (m as any).id;
        if (id === selectedTrackId) {
          map[companyName] = (map[companyName] || 0) + 1;
        }
      }
    }
    return Object.entries(map).map(([company, count]) => ({ company, count }));
  }, [logSheets, selectedTrackId]);

  const topSongs = useMemo(() => songCounts.sort((a: any, b: any) => b.count - a.count).slice(0, 10), [songCounts]);
  const topCompanies = useMemo(() => companyCounts.sort((a: any, b: any) => b.selectedMusic - a.selectedMusic).slice(0, 10), [companyCounts]);

  const globalTimeline = useMemo(() => {
    const map: Record<string, number> = {};
    for (const sheet of logSheets) {
      const date = new Date(sheet.createdDate).toLocaleDateString();
      map[date] = (map[date] || 0) + (sheet.selectedMusic?.length || 0);
    }
    return Object.entries(map)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30);
  }, [logSheets]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'];

  const isCurrentTrackVideo = currentTrack?.fileType?.toLowerCase().includes('video');

  return (
    <DashboardLayout title="Your Performance">
      {/* Media Players */}
      {isCurrentTrackVideo ? (
        <VideoPlayerDialog 
          open={playerOpen} 
          onOpenChange={setPlayerOpen} 
          track={currentTrack ? {
            id: currentTrack.id,
            title: currentTrack.title,
            artist: currentTrack.artist,
            fileUrl: currentTrack.fileUrl,
            fileType: currentTrack.fileType
          } : null} 
        />
      ) : (
        <MusicPlayerDialog 
          open={playerOpen} 
          onOpenChange={setPlayerOpen} 
          track={currentTrack ? {
            id: currentTrack.id,
            title: currentTrack.title,
            artist: currentTrack.artist,
            fileUrl: currentTrack.fileUrl,
            fileType: currentTrack.fileType,
            duration: currentTrack.duration
          } : null} 
        />
      )}

        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your Performance (Artist)</h1>
              <p className="text-sm text-muted-foreground sm:text-base">
                Track your music selections across all companies using log sheets
              </p>
            </div>
            <div className="w-full max-w-md sm:w-auto">
              <Input
                placeholder="Search your tracks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

        {/* Quick Track Lookup */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Your Track Lookup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Search your songs by title to see how many companies have selected them.
            </p>
            <div className="grid grid-cols-1 gap-4">
              <div className="max-h-60 overflow-x-auto overflow-y-auto rounded-xl border border-border/40 bg-card/40">
                <table className="min-w-full table-fixed text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Title</th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selections</th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Companies</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {songCounts
                      .filter((s: any) => !search.trim() || s.title.toLowerCase().includes(search.toLowerCase()))
                      .sort((a: any, b: any) => b.count - a.count)
                      .map((s: any) => (
                        <tr key={s.id} className="transition-colors hover:bg-muted/40">
                          <td className="px-3 py-2 align-top">
                            <div className="flex items-start gap-3">
                              {s.track?.fileType?.toLowerCase().includes('video') ? (
                                <Video className="mt-0.5 h-4 w-4 text-muted-foreground" />
                              ) : (
                                <FileMusic className="mt-0.5 h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="flex-1 truncate text-sm font-medium leading-tight text-foreground" title={s.title}>
                                {s.title}
                              </span>
                              {s.track?.fileUrl && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 shrink-0 rounded-full p-0 text-primary hover:bg-primary/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentTrack(s.track);
                                    setPlayerOpen(true);
                                  }}
                                  aria-label={`Preview ${s.title}`}
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 align-top text-sm font-semibold text-foreground">{s.count}</td>
                          <td className="px-3 py-2 align-top">
                            <div className="flex flex-wrap gap-1.5">
                              {Object.keys(s.companies || {}).length > 0 ? (
                                Object.keys(s.companies).map((company) => (
                                  <span
                                    key={company}
                                    className="rounded-full bg-muted/70 px-2 py-0.5 text-xs font-medium text-muted-foreground"
                                  >
                                    {company}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Songs: table + histogram + company breakdown */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Your Top Songs</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-48 animate-pulse rounded-xl bg-muted/40" />
            ) : songCounts.length === 0 ? (
              user?.role === 'ARTIST' ? (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>No selections found. Artists cannot fetch cross-company log sheets directly for security reasons.</p>
                  <p>
                    If you believe companies have selected your music, ask an admin to run the report or have companies share their log sheets. Alternatively, if you have a company account, sign in as that company to view its log sheets.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No selections found. Share your music with companies so they can select it in their log sheets!</p>
              )
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-3">
                  <h4 className="text-lg font-semibold">All Your Songs</h4>
                  <div className="max-h-64 overflow-x-auto overflow-y-auto rounded-xl border border-border/40 bg-card/30">
                    <table className="min-w-full table-fixed text-sm">
                      <thead>
                        <tr className="text-left">
                          <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Title</th>
                          <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selections</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {songCounts
                          .filter((s: any) => !search.trim() || s.title.toLowerCase().includes(search.toLowerCase()))
                          .sort((a: any, b: any) => b.count - a.count)
                          .map((s: any) => (
                            <tr
                              key={s.id}
                              className={`cursor-pointer transition-colors hover:bg-muted/40 ${selectedTrackId === s.id ? 'bg-muted/30' : ''}`}
                              onClick={() => setSelectedTrackId(s.id)}
                            >
                              <td className="px-3 py-2 align-top">
                                <div className="flex items-start gap-3">
                                  {s.track?.fileType?.toLowerCase().includes('video') ? (
                                    <Video className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <FileMusic className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                  )}
                                  <span className="flex-1 truncate text-sm font-medium leading-tight text-foreground" title={s.title}>
                                    {s.title}
                                  </span>
                                  {s.track?.fileUrl && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 shrink-0 rounded-full p-0 text-primary hover:bg-primary/10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentTrack(s.track);
                                        setPlayerOpen(true);
                                      }}
                                      aria-label={`Preview ${s.title}`}
                                    >
                                      <Play className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 align-top text-sm font-semibold text-foreground">{s.count}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-4 lg:col-span-2">
                  <h4 className="text-lg font-semibold">Selections Distribution (Histogram)</h4>
                  <div className="h-[240px] w-full sm:h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(() => {
                          const values = songCounts.map((s: any) => s.count);
                          if (values.length === 0) return [];
                          const max = Math.max(...values, 1);
                          const min = Math.min(...values, 0);
                          const binCount = Math.min(12, Math.max(6, Math.ceil(values.length / 5)));
                          const binSize = (max - min) / binCount;
                          const bins = new Array(binCount).fill(0);
                          values.forEach((v) => {
                            const idx = Math.min(Math.floor((v - min) / (binSize || 1)), binCount - 1);
                            bins[idx]++;
                          });
                          return bins.map((count, i) => ({ range: `${Math.round(min + i * binSize)}-${Math.round(min + (i + 1) * binSize)}`, count }));
                        })()}
                        margin={{ top: 10, right: 16, left: 12, bottom: 56 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" angle={-45} textAnchor="end" height={56} tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} label={{ value: 'Number of Songs', angle: -90, position: 'insideLeft', offset: -4 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#82ca9d">
                          {new Array(12).fill(0).map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {selectedTrackId && (
                    <div className="space-y-3">
                      <h5 className="font-semibold">Companies that selected this song</h5>
                      <div className="max-h-40 overflow-x-auto overflow-y-auto rounded-lg border border-border/30 bg-card/20">
                        <table className="min-w-full table-fixed text-sm">
                          <thead>
                            <tr className="text-left">
                              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Company</th>
                              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Count</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {selectedCompanyData.map((c: any) => (
                              <tr key={c.company} className="transition-colors hover:bg-muted/40">
                                <td className="px-3 py-2 text-sm font-medium text-foreground">{c.company}</td>
                                <td className="px-3 py-2 text-sm font-semibold text-foreground">{c.count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>All Your Songs</CardTitle>
            </CardHeader>
            <CardContent>
              {artistCounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No song activity</p>
              ) : (
                <div className="space-y-4">
                  <div className="max-h-64 overflow-x-auto overflow-y-auto rounded-xl border border-border/40 bg-card/30">
                    <table className="min-w-full table-fixed text-sm">
                      <thead>
                        <tr className="text-left">
                          <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Song</th>
                          <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selections</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {artistCounts
                          .filter((a: any) => !search.trim() || a.name.toLowerCase().includes(search.toLowerCase()))
                          .sort((a: any, b: any) => b.count - a.count)
                          .map((a: any) => (
                            <tr key={a.name} className="transition-colors hover:bg-muted/40">
                              <td className="px-3 py-2 text-sm font-medium text-foreground">{a.name}</td>
                              <td className="px-3 py-2 text-sm font-semibold text-foreground">{a.count}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="h-[220px] w-full sm:h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={artistCounts.map((a: any) => ({ name: a.name, count: a.count }))}
                        margin={{ top: 10, right: 16, left: 12, bottom: 56 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={56} tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8884d8">
                          {artistCounts.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Top Companies</CardTitle>
            </CardHeader>
            <CardContent>
              {companyCounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No company activity</p>
              ) : (
                <div className="space-y-4">
                  <div className="max-h-64 overflow-x-auto overflow-y-auto rounded-xl border border-border/40 bg-card/30">
                    <table className="min-w-full table-fixed text-sm">
                      <thead>
                        <tr className="text-left">
                          <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Company</th>
                          <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">LogSheets</th>
                          <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selected Songs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {companyCounts
                          .filter((c: any) => !search.trim() || c.company.toLowerCase().includes(search.toLowerCase()))
                          .sort((a: any, b: any) => b.selectedMusic - a.selectedMusic)
                          .map((c: any) => (
                            <tr
                              key={c.company}
                              className={`cursor-pointer transition-colors hover:bg-muted/40 ${selectedCompany === c.company ? 'bg-muted/30' : ''}`}
                              onClick={() => setSelectedCompany(c.company)}
                            >
                              <td className="px-3 py-2 text-sm font-medium text-foreground">{c.company}</td>
                              <td className="px-3 py-2 text-sm font-semibold text-foreground">{c.sheets}</td>
                              <td className="px-3 py-2 text-sm font-semibold text-foreground">{c.selectedMusic}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="h-[220px] w-full sm:h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={companyCounts.map((c: any) => ({ name: c.company, count: c.selectedMusic }))}
                        margin={{ top: 10, right: 16, left: 12, bottom: 56 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={56} tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#ffc658">
                          {companyCounts.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Company Details</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedCompany ? (
                <div className="text-sm text-muted-foreground">Click a company to view their selections of your music</div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-lg font-semibold">{selectedCompany}</h4>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Summary</p>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div>
                        Total LogSheets: <span className="font-semibold">{companyCounts.find((c: any) => c.company === selectedCompany)?.sheets || 0}</span>
                      </div>
                      <div>
                        Total Songs Selected: <span className="font-semibold">{companySelectedCountMap[selectedCompany] || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="font-semibold">Per-Song Counts</h5>
                    <div className="max-h-40 overflow-x-auto overflow-y-auto rounded-lg border border-border/30 bg-card/20">
                      <table className="min-w-full table-fixed text-sm">
                        <thead>
                          <tr className="text-left">
                            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Song</th>
                            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {Object.entries(
                            songCounts.reduce((acc: Record<string, any>, s: any) => {
                              acc[s.title] = { title: s.title, count: s.companies?.[selectedCompany] || 0 };
                              return acc;
                            }, {}),
                          )
                            .map(([_, v]: any) => v)
                            .filter((r: any) => r.count > 0)
                            .sort((a: any, b: any) => b.count - a.count)
                            .map((r: any) => (
                              <tr key={r.title} className="transition-colors hover:bg-muted/40">
                                <td className="px-3 py-2 text-sm font-medium text-foreground">{r.title}</td>
                                <td className="px-3 py-2 text-sm font-semibold text-foreground">{r.count}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="font-semibold">LogSheets</h5>
                    <div className="max-h-48 overflow-x-auto overflow-y-auto rounded-lg border border-border/30 bg-card/20">
                      <table className="min-w-full table-fixed text-sm">
                        <thead>
                          <tr className="text-left">
                            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selected Songs</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {(companySheetsMap[selectedCompany] || []).map((s: any) => (
                            <tr
                              key={s.id}
                              className="cursor-pointer transition-colors hover:bg-muted/40"
                              onClick={() => {
                                setSelectedLogSheet(s);
                                setLogSheetDialogOpen(true);
                              }}
                            >
                              <td className="px-3 py-2 text-sm font-medium text-foreground">{new Date(s.createdDate).toLocaleDateString()}</td>
                              <td className="px-3 py-2 text-sm text-foreground">{(s.selectedMusic || []).map((m: any) => m.title).join(', ')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <Dialog open={logSheetDialogOpen} onOpenChange={setLogSheetDialogOpen}>
                    <DialogContent className="max-w-lg space-y-4">
                      <DialogHeader>
                        <DialogTitle>LogSheet Details</DialogTitle>
                      </DialogHeader>
                      {selectedLogSheet ? (
                        <div className="space-y-4 text-sm">
                          <div>
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Company</div>
                            <div className="font-semibold">{selectedLogSheet.company?.companyName || 'Unknown Company'}</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Date</div>
                            <div className="font-semibold">{new Date(selectedLogSheet.createdDate).toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Selected Tracks</div>
                            <div className="space-y-2">
                              {(selectedLogSheet.selectedMusic || []).length === 0 ? (
                                <div className="text-muted-foreground">No tracks selected.</div>
                              ) : (
                                (selectedLogSheet.selectedMusic || []).map((track: any) => (
                                  <div
                                    key={track.id ?? track.title}
                                    className="flex flex-wrap items-center gap-2 rounded border border-border/40 p-2"
                                  >
                                    {track.fileType?.toLowerCase().includes('video') ? (
                                      <Video className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <FileMusic className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="text-sm font-semibold text-foreground">{track.title}</span>
                                    <span className="text-xs text-muted-foreground">{track.artist || 'Unknown Artist'}</span>
                                    {track.fileUrl && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 shrink-0 rounded-full p-0 text-primary hover:bg-primary/10"
                                        onClick={() => {
                                          setCurrentTrack(track);
                                          setPlayerOpen(true);
                                        }}
                                        aria-label={`Preview ${track.title}`}
                                      >
                                        <Play className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-muted-foreground">LogSheet undefined.</div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Your Selections Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px] w-full sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={globalTimeline} margin={{ top: 10, right: 16, left: 12, bottom: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="count" stroke="#00C49F" strokeWidth={2} name="Selections" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ArtistPerformance;
