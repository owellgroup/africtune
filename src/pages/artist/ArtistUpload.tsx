import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { artistAPI, lookupAPI } from '@/services/api';
import { MemberDetails, MusicUploadForm, ArtistUploadType, ArtistWorkType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import MusicUploadSuccessDialog from '@/components/common/MusicUploadSuccessDialog';

const normalizeStatus = (details?: MemberDetails | null): string => {
  if (!details) return '';
  const raw = details.status?.statusName ?? (details as any)?.status?.status ?? '';
  return typeof raw === 'string' ? raw.toUpperCase() : '';
};

const extractArtistIdFromProfile = (details?: MemberDetails | null): string => {
  if (!details) return '';
  const candidate = (details as any)?.ArtistId ?? (details as any)?.artistId ?? '';
  if (candidate === null || candidate === undefined) return '';
  const value = typeof candidate === 'string' ? candidate : String(candidate);
  return value.trim();
};

const deriveArtistNameFromProfile = (details?: MemberDetails | null): string => {
  if (!details) return '';
  const parts = [details.firstName, details.surname].filter(Boolean);
  return parts.join(' ').trim();
};

const deriveGroupNameFromProfile = (details?: MemberDetails | null): string => {
  if (!details) return '';
  const candidate =
    (details as any)?.groupNameORStageName ??
    (details as any)?.groupNameOrStageName ??
    (details as any)?.groupOrBandOrStageName ??
    (details as any)?.groupnameOrStageName ??
    (details as any)?.groupnameorStageName ??
    (details as any)?.groupName ??
    (details as any)?.stageName ??
    (details as any)?.pseudonym ??
    '';
  return typeof candidate === 'string' ? candidate.trim() : '';
};

const createResetFormState = (prev: MusicUploadForm): MusicUploadForm => ({
  title: '',
  file: null as any,
  ArtistId: prev.ArtistId,
  albumName: '',
  artist: prev.artist,
  groupOrBandOrStageName: prev.groupOrBandOrStageName,
  featuredArtist: '',
  producer: '',
  duration: '',
  country: prev.country,
  artistUploadTypeId: undefined,
  artistWorkTypeId: undefined,
  composer: '',
  author: '',
  arranger: '',
  publisher: '',
  publishersName: '',
  publisherAddress: '',
  publisherTelephone: '',
  recordedBy: '',
  addressOfRecordingCompany: '',
  recordingCompanyTelephone: '',
  labelName: '',
  dateRecorded: '',
});

const ArtistUpload: React.FC = () => {
  const [form, setForm] = useState<MusicUploadForm>(() => ({
    title: '',
    file: null as any,
    ArtistId: '',
    albumName: '',
    artist: '',
    groupOrBandOrStageName: '',
    featuredArtist: '',
    producer: '',
    duration: '',
    country: '',
    artistUploadTypeId: undefined,
    artistWorkTypeId: undefined,
    composer: '',
    author: '',
    arranger: '',
    publisher: '',
    publishersName: '',
    publisherAddress: '',
    publisherTelephone: '',
    recordedBy: '',
    addressOfRecordingCompany: '',
    recordingCompanyTelephone: '',
    labelName: '',
    dateRecorded: '',
  }));
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [profile, setProfile] = useState<MemberDetails | null>(null);
  const [lookups, setLookups] = useState<{ uploadTypes: ArtistUploadType[]; workTypes: ArtistWorkType[] }>({
    uploadTypes: [],
    workTypes: [],
  });
  const [successOpen, setSuccessOpen] = useState(false);
  const [uploadedTitle, setUploadedTitle] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const profileStatus = useMemo(() => normalizeStatus(profile), [profile]);
  const isApproved = profileStatus === 'APPROVED';
  const profileArtistId = useMemo(() => extractArtistIdFromProfile(profile), [profile]);
  const hasArtistId = Boolean((form.ArtistId ?? '').toString().trim());

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [profileResponse, uploadTypes, workTypes] = await Promise.all([
          artistAPI.getProfile().catch(() => null),
          lookupAPI.getArtistUploadTypes().catch(() => []),
          lookupAPI.getArtistWorkTypes().catch(() => []),
        ]);

        if (!active) return;

        setProfile(profileResponse);
        setLookups({ uploadTypes, workTypes });
      } finally {
        if (active) {
          setInitializing(false);
        }
      }
    };

    loadData();

    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key !== 'namsa:update') return;
      try {
        const payload = JSON.parse(e.newValue || '{}');
        if (payload?.type === 'profile' && payload.userId) {
          artistAPI
            .getProfile()
            .then(profileResponse => {
              if (!active) return;
              setProfile(profileResponse);
            })
            .catch(() => {
              if (!active) return;
              setProfile(null);
            });
          toast({ title: 'Profile Status Updated', description: 'Your profile status was updated by an admin.' });
        }
      } catch (err) {
        // ignore malformed events
      }
    };

    window.addEventListener('storage', onStorage);
    return () => {
      active = false;
      window.removeEventListener('storage', onStorage);
    };
  }, [toast]);

  useEffect(() => {
    if (!profile) return;

    setForm(prev => {
      const updates: Partial<MusicUploadForm> = {};
      const profileArtistId = extractArtistIdFromProfile(profile);
      if (profileArtistId && profileArtistId !== (prev.ArtistId ?? '').trim()) {
        updates.ArtistId = profileArtistId;
      }

      if (!prev.artist?.trim()) {
        const name = deriveArtistNameFromProfile(profile);
        if (name) updates.artist = name;
      }

      if (!prev.groupOrBandOrStageName?.trim()) {
        const groupName = deriveGroupNameFromProfile(profile);
        if (groupName) updates.groupOrBandOrStageName = groupName;
      }

      if (!prev.country?.trim() && profile.country) {
        updates.country = profile.country;
      }

      return Object.keys(updates).length ? { ...prev, ...updates } : prev;
    });
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setForm(prev => ({ ...prev, file }));
  };

  const handleUpload = async () => {
    if (initializing) {
      toast({ title: 'Loading profile details', description: 'Please wait a moment while we confirm your approval status.', variant: 'destructive' });
      return;
    }

    if (!user) {
      toast({ title: 'Please sign in', description: 'You must be signed in to upload music.', variant: 'destructive' });
      return;
    }
    if (user.role !== 'ARTIST') {
      toast({ title: 'Not permitted', description: 'Only artist accounts can upload music.', variant: 'destructive' });
      return;
    }
    if (!isApproved) {
      toast({ title: 'Profile not approved', description: 'Your profile must be approved before you can upload music.', variant: 'destructive' });
      return;
    }

    const trimmedTitle = form.title.trim();
    const artistId = (form.ArtistId ?? '').toString().trim();

    if (!form.file || !trimmedTitle || !artistId) {
      toast({
        title: 'Missing required details',
        description: 'Please select a file, enter a song title, and ensure your Artist ID is present.',
        variant: 'destructive',
      });
      return;
    }

    if (!form.artistUploadTypeId || !form.artistWorkTypeId) {
      toast({
        title: 'Missing required fields',
        description: 'Please select Upload Type and Work Type before uploading.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const payload: MusicUploadForm = {
        ...form,
        title: trimmedTitle,
        ArtistId: artistId,
      };
      await artistAPI.uploadMusic(payload);
      setUploadedTitle(trimmedTitle);
      setForm(prev => createResetFormState({
        ...prev,
        ArtistId: artistId,
        artist: prev.artist,
        groupOrBandOrStageName: prev.groupOrBandOrStageName,
        country: prev.country,
      }));
      setSuccessOpen(true);
      toast({
        title: 'Upload Successful',
        description: 'Your music has been uploaded successfully!',
      });
    } catch (error: any) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message || error?.response?.data?.error || error?.message;
      if (status === 403) {
        toast({
          title: 'Upload Forbidden',
          description: message || 'Access denied. Ensure you are logged in as an ARTIST and your profile is approved.',
          variant: 'destructive',
        });
      } else if (status === 401) {
        toast({ title: 'Unauthorized', description: 'Your session may have expired. Please sign in again.', variant: 'destructive' });
      } else {
        toast({
          title: 'Upload Failed',
          description: message || 'Failed to upload music',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Upload Music">
      <Card>
        <CardHeader>
          <CardTitle>Upload Music</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!user && (
            <div className="p-3 rounded border border-yellow-200 bg-yellow-50 text-sm text-yellow-800">
              Please sign in to upload music.
            </div>
          )}
          {initializing && (
            <div className="p-3 rounded border border-blue-200 bg-blue-50 text-sm text-blue-800">
              Loading your artist profile and verification details...
            </div>
          )}
          {!initializing && !!profileStatus && !isApproved && (
            <div className="p-3 rounded border border-yellow-200 bg-yellow-50 text-sm text-yellow-800">
              Your profile is not approved yet. You cannot upload music until approval.
            </div>
          )}
          {isApproved && !hasArtistId && (
            <div className="p-3 rounded border border-amber-200 bg-amber-50 text-sm text-amber-800">
              We could not locate an Artist ID on your approved profile. Please contact the NAMSA support team so they can assign one before you upload music.
            </div>
          )}

          {/* Basic Track Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Basic Track Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="ArtistId">ArtistId *</Label>
                <Input 
                  id="ArtistId" 
                  name="ArtistId" 
                  value={form.ArtistId ?? ''} 
                  onChange={(e) => setForm(prev => ({ ...prev, ArtistId: e.target.value }))}
                  placeholder="Artist ID will appear once your profile is approved"
                  required
                  readOnly={Boolean(profileArtistId)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {profileArtistId
                    ? 'Pulled automatically from your approved artist profile.'
                    : 'If you have not received an Artist ID, please contact the NAMSA admin team.'}
                </p>
              </div>
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input 
                  id="title" 
                  name="title" 
                  value={form.title} 
                  onChange={handleChange}
                  placeholder="Enter song title"
                  required
                />
              </div>
              <div>
                <Label htmlFor="albumName">Album Name</Label>
                <Input 
                  id="albumName" 
                  name="albumName" 
                  value={form.albumName || ''} 
                  onChange={handleChange}
                  placeholder="Enter album name"
                />
              </div>
              <div>
                <Label htmlFor="artist">Artist</Label>
                <Input 
                  id="artist" 
                  name="artist" 
                  value={form.artist || ''} 
                  onChange={handleChange}
                  placeholder="Enter artist name"
                />
              </div>
              <div>
                <Label htmlFor="groupOrBandOrStageName">Group/Band/Stage Name</Label>
                <Input 
                  id="groupOrBandOrStageName" 
                  name="groupOrBandOrStageName" 
                  value={form.groupOrBandOrStageName || ''} 
                  onChange={handleChange}
                  placeholder="Enter group/band/stage name"
                />
              </div>
              <div>
                <Label htmlFor="featuredArtist">Featured Artist</Label>
                <Input 
                  id="featuredArtist" 
                  name="featuredArtist" 
                  value={form.featuredArtist || ''} 
                  onChange={handleChange}
                  placeholder="Enter featured artist"
                />
              </div>
              <div>
                <Label htmlFor="producer">Producer</Label>
                <Input 
                  id="producer" 
                  name="producer" 
                  value={form.producer || ''} 
                  onChange={handleChange}
                  placeholder="Enter producer name"
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration</Label>
                <Input 
                  id="duration" 
                  name="duration" 
                  value={form.duration || ''} 
                  onChange={handleChange}
                  placeholder="e.g., 3:45"
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input 
                  id="country" 
                  name="country" 
                  value={form.country || ''} 
                  onChange={handleChange}
                  placeholder="Enter country"
                />
              </div>
            </div>
          </div>

          {/* Upload and Work Type */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Upload and Work Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="artistUploadTypeId">Upload Type</Label>
                <Select value={form.artistUploadTypeId?.toString() || ''} onValueChange={(value) => setForm(prev => ({ ...prev, artistUploadTypeId: value ? parseInt(value) : undefined }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select upload type (required)" />
                  </SelectTrigger>
                  <SelectContent>
                    {lookups.uploadTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>{type.typeName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="artistWorkTypeId">Work Type</Label>
                <Select value={form.artistWorkTypeId?.toString() || ''} onValueChange={(value) => setForm(prev => ({ ...prev, artistWorkTypeId: value ? parseInt(value) : undefined }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select work type (required)" />
                  </SelectTrigger>
                  <SelectContent>
                    {lookups.workTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>{type.workTypeName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Creative Credits */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Creative Credits</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="composer">Composer</Label>
                <Input 
                  id="composer" 
                  name="composer" 
                  value={form.composer || ''} 
                  onChange={handleChange}
                  placeholder="Enter composer name"
                />
              </div>
              <div>
                <Label htmlFor="author">Author</Label>
                <Input 
                  id="author" 
                  name="author" 
                  value={form.author || ''} 
                  onChange={handleChange}
                  placeholder="Enter author name"
                />
              </div>
              <div>
                <Label htmlFor="arranger">Arranger</Label>
                <Input 
                  id="arranger" 
                  name="arranger" 
                  value={form.arranger || ''} 
                  onChange={handleChange}
                  placeholder="Enter arranger name"
                />
              </div>
              <div>
                <Label htmlFor="publisher">Publisher</Label>
                <Input 
                  id="publisher" 
                  name="publisher" 
                  value={form.publisher || ''} 
                  onChange={handleChange}
                  placeholder="Enter publisher name"
                />
              </div>
              <div>
                <Label htmlFor="publishersName">Publisher's Name</Label>
                <Input 
                  id="publishersName" 
                  name="publishersName" 
                  value={form.publishersName || ''} 
                  onChange={handleChange}
                  placeholder="Enter publisher's name"
                />
              </div>
              <div>
                <Label htmlFor="publisherAddress">Publisher Address</Label>
                <Input 
                  id="publisherAddress" 
                  name="publisherAddress" 
                  value={form.publisherAddress || ''} 
                  onChange={handleChange}
                  placeholder="Enter publisher address"
                />
              </div>
              <div>
                <Label htmlFor="publisherTelephone">Publisher Telephone</Label>
                <Input 
                  id="publisherTelephone" 
                  name="publisherTelephone" 
                  value={form.publisherTelephone || ''} 
                  onChange={handleChange}
                  placeholder="Enter publisher telephone"
                />
              </div>
            </div>
          </div>

          {/* Recording Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Recording Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="recordedBy">Recorded By</Label>
                <Input 
                  id="recordedBy" 
                  name="recordedBy" 
                  value={form.recordedBy || ''} 
                  onChange={handleChange}
                  placeholder="Enter recording engineer"
                />
              </div>
              <div>
                <Label htmlFor="addressOfRecordingCompany">Recording Company Address</Label>
                <Input 
                  id="addressOfRecordingCompany" 
                  name="addressOfRecordingCompany" 
                  value={form.addressOfRecordingCompany || ''} 
                  onChange={handleChange}
                  placeholder="Enter recording company address"
                />
              </div>
              <div>
                <Label htmlFor="recordingCompanyTelephone">Recording Company Telephone</Label>
                <Input 
                  id="recordingCompanyTelephone" 
                  name="recordingCompanyTelephone" 
                  value={form.recordingCompanyTelephone || ''} 
                  onChange={handleChange}
                  placeholder="Enter recording company telephone"
                />
              </div>
              <div>
                <Label htmlFor="labelName">Label Name</Label>
                <Input 
                  id="labelName" 
                  name="labelName" 
                  value={form.labelName || ''} 
                  onChange={handleChange}
                  placeholder="Enter record label name"
                />
              </div>
              <div>
                <Label htmlFor="dateRecorded">Date Recorded</Label>
                <Input 
                  id="dateRecorded" 
                  name="dateRecorded" 
                  type="date"
                  value={form.dateRecorded || ''} 
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <h3 className="text-lg font-semibold mb-4">File Upload</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">Audio/Video File *</Label>
                <Input 
                  id="file" 
                  type="file" 
                  accept="audio/*,video/*" 
                  onChange={handleFileChange}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Supported formats: MP3, WAV, M4A, MP4, AVI, MOV
                </p>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleUpload} 
            disabled={
              loading ||
              initializing ||
              !user ||
              !form.file ||
              !form.title.trim() ||
              !isApproved ||
              !hasArtistId ||
              !form.artistUploadTypeId ||
              !form.artistWorkTypeId
            }
            className="w-full"
          >
            {loading ? 'Uploading...' : 'Upload Music'}
          </Button>
        </CardContent>
      </Card>
      <MusicUploadSuccessDialog open={successOpen} onOpenChange={setSuccessOpen} musicTitle={uploadedTitle} />
    </DashboardLayout>
  );
};

export default ArtistUpload;
