import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { artistAPI, lookupAPI, companyAPI } from '@/services/api';
import { MemberDetails, MemberDetailsForm, LogSheet } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, 
  FileText, 
  Image, 
  Eye, 
  Edit, 
  Upload, 
  CheckCircle, 
  Clock, 
  XCircle,
  ArrowRight,
  ArrowLeft,
  Save
} from 'lucide-react';

const ArtistProfile: React.FC = () => {
  const [profile, setProfile] = useState<MemberDetails | null>(null);
  const [documents, setDocuments] = useState<any>(null);
  const [form, setForm] = useState<MemberDetailsForm>({
    firstName: '',
    surname: '',
    email: '',
    phoneNumber: '',
  });
  const populateFormFromProfile = (profileData: MemberDetails) => {
    setForm({
      firstName: profileData.firstName || '',
      surname: profileData.surname || '',
      email: profileData.email || '',
      phoneNumber: profileData.phoneNumber || '',
      idNumber: profileData.idNumber || undefined,
      pseudonym: profileData.pseudonym || '',
      groupNameORStageName: profileData.groupNameORStageName || '',
      noOFDependents: profileData.noOFDependents || undefined,
      typeOfWork: profileData.typeOfWork || '',
      line1: profileData.line1 || '',
      line2: profileData.line2 || '',
      city: profileData.city || '',
      region: profileData.region || '',
      poBox: profileData.poBox || '',
      postalCode: profileData.postalCode || '',
      country: profileData.country || '',
      birthDate: profileData.birthDate || '',
      placeOfBirth: profileData.placeOfBirth || '',
      idOrPassportNumber: profileData.idOrPassportNumber || '',
      nationality: profileData.nationality || '',
      occupation: profileData.occupation || '',
      nameOfEmployer: profileData.nameOfEmployer || '',
      addressOfEmployer: profileData.addressOfEmployer || '',
      nameOfTheBand: profileData.nameOfTheBand || '',
      dateFounded: profileData.dateFounded || '',
      numberOfBand: profileData.numberOfBand || undefined,
      accountHolderName: profileData.accountHolderName || '',
      bankAccountNumber: profileData.bankAccountNumber || '',
      bankAccountType: profileData.bankAccountType || '',
      bankBranchName: profileData.bankBranchName || '',
      bankBranchNumber: profileData.bankBranchNumber || '',
      bankNameId: profileData.bankName?.id || undefined,
      titleId: (profileData as any).title?.id || (profileData as any).tittle?.id || undefined,
      maritalStatusId: profileData.maritalStatus?.id || undefined,
      memberCategoryId: profileData.memberCategory?.id || undefined,
      genderId: profileData.gender?.id || undefined,
    });
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [lookups, setLookups] = useState({
    titles: [],
    maritalStatuses: [],
    memberCategories: [],
    genders: [],
    bankNames: [],
  });
  
  // Document upload states
  const [documentUploads, setDocumentUploads] = useState<Record<string, { file: File | null; title: string }>>({
    passportPhoto: { file: null, title: 'Passport Photo' },
    idDocument: { file: null, title: 'ID Document' },
    bankConfirmationLetter: { file: null, title: 'Bank Confirmation Letter' },
    proofOfPayment: { file: null, title: 'Proof of Payment' },
  });
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [selectedTab, setSelectedTab] = useState<'profile'|'performance'>('profile');
  const [logSheets, setLogSheets] = useState<LogSheet[]>([]);
  const [performanceLoading, setPerformanceLoading] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const preservedIpi = useMemo(() => {
    const profileIpi = (profile as any)?.IPI_number || (profile as any)?.ipi_number || (profile as any)?.ipiNumber;
    if (profileIpi) return String(profileIpi);

    const documentIpi = (documents?.memberDetails as any)?.IPI_number ||
      (documents?.memberDetails as any)?.ipi_number ||
      (documents?.memberDetails as any)?.ipiNumber;

    return documentIpi ? String(documentIpi) : '';
  }, [profile, documents]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        // Load lookups
        const [titles, maritalStatuses, memberCategories, genders, bankNames] = await Promise.all([
          lookupAPI.getTitles().catch(() => []),
          lookupAPI.getMaritalStatuses().catch(() => []),
          lookupAPI.getMemberCategories().catch(() => []),
          lookupAPI.getGenders().catch(() => []),
          lookupAPI.getBankNames().catch(() => []),
        ]);
        
        setLookups({
          titles,
          maritalStatuses,
          memberCategories,
          genders,
          bankNames,
        });
        
        // Load profile and documents
        try {
          const profileData = await artistAPI.getProfile();
          const documentsData = await artistAPI.getDocuments();
          
          setProfile(profileData);
          setDocuments(documentsData);
          
          // Populate form with existing data
          populateFormFromProfile(profileData);
        } catch (error) {
          // Profile doesn't exist yet, show create form
          setIsCreating(true);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    // Load performance log sheets when the tab is selected
    if (selectedTab !== 'performance') return;
    const loadPerformance = async () => {
      try {
        setPerformanceLoading(true);
        const sheets = await companyAPI.getLogSheets().catch(() => []);
        setLogSheets(sheets);
      } catch (e) {
        // ignore
      } finally {
        setPerformanceLoading(false);
      }
    };
    loadPerformance();
  }, [selectedTab]);

  useEffect(() => {
    // Listen for status updates broadcast by admin actions (other tabs/windows)
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key !== 'namsa:update' || !user) return;
      try {
        const payload = JSON.parse(e.newValue || '{}');
        if (payload?.type === 'profile' && payload.userId && payload.userId === user.id) {
          // reload profile and documents
          artistAPI.getProfile().then((p) => setProfile(p)).catch(() => {});
          artistAPI.getDocuments().then((d) => setDocuments(d)).catch(() => {});
          toast({ title: 'Profile Status Changed', description: 'Your profile status was updated by an admin.' });
        }
      } catch (err) {
        // ignore
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value ? parseInt(value) : undefined }));
  };

  const handleNextPage = async () => {
    // Validate required fields on page 1
    if (!form.firstName.trim() || !form.surname.trim() || !form.email.trim() || !form.phoneNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (First Name, Surname, Email, Phone Number)",
        variant: "destructive",
      });
      return;
    }

    // Simply proceed to documents page without submitting
    setCurrentPage(2);
  };

  const handleDocumentUpload = async (documentType: string) => {
    const uploadData = documentUploads[documentType];
    if (!uploadData.file) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(prev => ({ ...prev, [documentType]: true }));

      switch (documentType) {
        case 'passportPhoto':
          if (documents?.passportPhoto) {
            await artistAPI.updatePassportPhotoByUser(uploadData.file, uploadData.title);
          } else {
            await artistAPI.uploadPassportPhoto(uploadData.file, uploadData.title);
          }
          break;
        case 'idDocument':
          if (documents?.idDocument) {
            await artistAPI.updateIdDocumentByUser(uploadData.file, uploadData.title);
          } else {
            await artistAPI.uploadIdDocument(uploadData.file, uploadData.title);
          }
          break;
        case 'bankConfirmationLetter':
          if (documents?.bankConfirmationLetter) {
            await artistAPI.updateBankLetterByUser(uploadData.file, uploadData.title);
          } else {
            await artistAPI.uploadBankConfirmationLetter(uploadData.file, uploadData.title);
          }
          break;
        case 'proofOfPayment':
          if (documents?.proofOfPayment) {
            await artistAPI.updateProofOfPaymentByUser(uploadData.file, uploadData.title);
          } else {
            await artistAPI.uploadProofOfPayment(uploadData.file, uploadData.title);
          }
          break;
      }

      // Clear the upload
      setDocumentUploads(prev => ({
        ...prev,
        [documentType]: { file: null, title: uploadData.title }
      }));

      toast({
        title: "Upload Successful",
        description: `${uploadData.title} uploaded successfully!`,
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error?.response?.data?.message || `Failed to upload ${uploadData.title}`,
        variant: "destructive",
      });
    } finally {
      setUploading(prev => ({ ...prev, [documentType]: false }));
    }
  };

  const updateDocumentUpload = (documentType: string, field: 'file' | 'title', value: any) => {
    setDocumentUploads(prev => ({
      ...prev,
      [documentType]: {
        ...prev[documentType],
        [field]: value
      }
    }));
  };

  const uploadAllSelectedDocuments = async () => {
    const toUpload = Object.entries(documentUploads).filter(([, v]) => v.file);
    for (const [key] of toUpload) {
      // sequential to avoid overwhelming the server
      // eslint-disable-next-line no-await-in-loop
      await handleDocumentUpload(key);
    }
  };

  const hasPendingDocumentUploads = () => Object.values(documentUploads).some((v) => v.file);

  const buildUpdatePayload = () => {
    const payload: any = { ...form };
    if (preservedIpi) {
      payload.IPI_number = preservedIpi;
      payload.ipiNumber = preservedIpi;
      payload.ipi_number = preservedIpi;
    }
    payload.notes = '';
    return payload;
  };

  const normalizeProfileResponse = (profileData: MemberDetails, shouldPreserveIpi: boolean): MemberDetails => {
    const normalized: any = { ...profileData };
    if (
      shouldPreserveIpi &&
      preservedIpi &&
      !((normalized as any).IPI_number || (normalized as any).ipi_number || (normalized as any).ipiNumber)
    ) {
      normalized.ipi_number = preservedIpi;
    }
    if ('notes' in normalized) {
      normalized.notes = '';
    }
    return normalized as MemberDetails;
  };

  const completeProfileSave = async (
    profileData: MemberDetails,
    options: { toastTitle: string; toastDescription: string; preserveIpi?: boolean }
  ) => {
    const normalizedProfile = normalizeProfileResponse(profileData, options.preserveIpi ?? false);
    setProfile(normalizedProfile);
    populateFormFromProfile(normalizedProfile);
    setIsCreating(false);
    setIsEditing(false);
    toast({ title: options.toastTitle, description: options.toastDescription });

    if (hasPendingDocumentUploads()) {
      await uploadAllSelectedDocuments();
    }

    setEditDialogOpen(false);
    setCurrentPage(1);

    try {
      const updatedDocs = await artistAPI.getDocuments();
      setDocuments(updatedDocs);
    } catch (docError) {
      console.warn('Failed to refresh documents after profile save:', docError);
    }
  };

  const handleSubmitProfile = async () => {
    if (saving) return;

    if (!form.firstName?.trim() || !form.surname?.trim() || !form.email?.trim() || !form.phoneNumber?.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in all required fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      if (isCreating) {
        const createdProfile = await artistAPI.createProfile(form);
        await completeProfileSave(createdProfile, {
          toastTitle: "Profile Created",
          toastDescription: "Your profile has been submitted for review.",
          preserveIpi: false,
        });
      } else {
        const updatedProfile = await artistAPI.updateProfile(buildUpdatePayload());
        await completeProfileSave(updatedProfile, {
          toastTitle: "Profile Updated",
          toastDescription: "Your profile has been updated successfully!",
          preserveIpi: true,
        });
      }
    } catch (error: any) {
      if (isCreating && error?.response?.status === 403) {
        console.warn('Create profile returned 403. Attempting update fallback.', error);
        try {
          const fallbackProfile = await artistAPI.updateProfile(buildUpdatePayload());
          await completeProfileSave(fallbackProfile, {
            toastTitle: "Profile Updated",
            toastDescription: "Existing profile detected. We updated it with your latest details.",
            preserveIpi: true,
          });
          return;
        } catch (fallbackError: any) {
          console.error('Profile fallback update failed:', fallbackError);
          toast({
            title: 'Submission Failed',
            description: fallbackError?.response?.data?.message || 'Failed to update existing profile. Please contact support.',
            variant: 'destructive',
          });
          return;
        }
      }

      console.error('Profile submission error:', error);
      toast({
        title: 'Submission Failed',
        description: error?.response?.data?.message || error?.message || 'Failed to submit profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleViewProfile = async () => {
    try {
      const fullData = await artistAPI.getDocuments();
      setDocuments(fullData);
      setViewDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load profile details",
        variant: "destructive",
      });
    }
  };

  const handleEditProfile = () => {
    setIsEditing(true);
    setCurrentPage(1);
    setEditDialogOpen(true);
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

  // Unified render using Tabs
  return (
    <DashboardLayout title="My Profile">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
            <p className="text-muted-foreground">View and manage your member profile</p>
          </div>

          <div className="w-full sm:w-auto">
            <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-2 gap-2">
                <TabsTrigger value="profile" className="py-2">Profile</TabsTrigger>
                <TabsTrigger value="performance" className="py-2">Performance</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)} className="mt-4">
          <TabsContent value="profile">
            {loading ? (
              <div className="h-32 bg-muted rounded-lg animate-pulse"></div>
            ) : profile && !isCreating && !isEditing ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span>Profile Submission</span>
                      {getStatusBadge(profile?.status?.status || 'PENDING')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full border-collapse border border-border rounded-lg">
                        <thead>
                          <tr className="bg-muted">
                            <th className="border border-border p-3 text-left">Name</th>
                            <th className="border border-border p-3 text-left">Email</th>
                            <th className="border border-border p-3 text-left">Phone</th>
                            <th className="border border-border p-3 text-left">Artist ID</th>
                            <th className="border border-border p-3 text-left">IPI Number</th>
                            <th className="border border-border p-3 text-left">Status</th>
                            <th className="border border-border p-3 text-left">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-border p-3">{profile.firstName} {profile.surname}</td>
                            <td className="border border-border p-3">{profile.email}</td>
                            <td className="border border-border p-3">{profile.phoneNumber}</td>
                            <td className="border border-border p-3">{(profile as any).artistId || (profile as any).ArtistId || '-'}</td>
                            <td className="border border-border p-3">{(profile as any).ipi_number || (profile as any).IPI_number || '-'}</td>
                            <td className="border border-border p-3">{getStatusBadge(profile?.status?.status || 'PENDING')}</td>
                            <td className="border border-border p-3">
                              <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" onClick={handleViewProfile}>
                                  <Eye className="w-4 h-4 mr-1" />
                                  View Profile
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleEditProfile}>
                                  <Edit className="w-4 h-4 mr-1" />
                                  Edit Profile
                                </Button>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="sm:hidden space-y-3">
                      <div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-semibold uppercase text-muted-foreground">Name</span>
                          <span className="text-sm text-foreground">{profile.firstName} {profile.surname}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-semibold uppercase text-muted-foreground">Email</span>
                          <span className="text-sm text-foreground break-words">{profile.email}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-semibold uppercase text-muted-foreground">Phone</span>
                          <span className="text-sm text-foreground">{profile.phoneNumber}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-semibold uppercase text-muted-foreground">Artist ID</span>
                          <span className="text-sm text-foreground">{(profile as any).artistId || (profile as any).ArtistId || '-'}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-semibold uppercase text-muted-foreground">IPI Number</span>
                          <span className="text-sm text-foreground">{(profile as any).ipi_number || (profile as any).IPI_number || '-'}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-semibold uppercase text-muted-foreground">Status</span>
                          <div>{getStatusBadge(profile?.status?.status || 'PENDING')}</div>
                        </div>
                        <div className="pt-2 border-t border-border/50 flex flex-col gap-2">
                          <Button variant="outline" size="sm" onClick={handleViewProfile} className="w-full">
                            <Eye className="w-4 h-4 mr-2" />
                            View Profile
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleEditProfile} className="w-full">
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Profile
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* View & Edit dialogs (unchanged) */}
                <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                  <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Complete Profile Details</DialogTitle>
                    </DialogHeader>
                    {documents && (
                      <div className="space-y-6">
                        {/* Member Details */}
                        <div>
                          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Member Information
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <Label>First Name</Label>
                              <Input value={documents.memberDetails?.firstName || '-'} disabled />
                            </div>
                            <div>
                              <Label>Surname</Label>
                              <Input value={documents.memberDetails?.surname || '-'} disabled />
                            </div>
                            <div>
                              <Label>Email</Label>
                              <Input value={documents.memberDetails?.email || '-'} disabled />
                            </div>
                            <div>
                              <Label>Phone</Label>
                              <Input value={documents.memberDetails?.phoneNumber || '-'} disabled />
                            </div>
                            <div>
                              <Label>ID Number</Label>
                              <Input value={documents.memberDetails?.idNumber || '-'} disabled />
                            </div>
                            <div>
                              <Label>Artist ID</Label>
                              <Input value={documents.memberDetails?.artistId || '-'} disabled />
                            </div>
                            <div>
                              <Label>IPI Number</Label>
                              <Input value={documents.memberDetails?.ipi_number || '-'} disabled />
                            </div>
                            <div>
                              <Label>Nationality</Label>
                              <Input value={documents.memberDetails?.nationality || '-'} disabled />
                            </div>
                            <div>
                              <Label>Occupation</Label>
                              <Input value={documents.memberDetails?.occupation || '-'} disabled />
                            </div>
                            <div>
                              <Label>Birth Date</Label>
                              <Input value={documents.memberDetails?.birthDate || '-'} disabled />
                            </div>
                            <div>
                              <Label>Place of Birth</Label>
                              <Input value={documents.memberDetails?.placeOfBirth || '-'} disabled />
                            </div>
                            <div>
                              <Label>Bank Account</Label>
                              <Input value={documents.memberDetails?.bankAccountNumber || '-'} disabled />
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Documents */}
                        <div>
                          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Uploaded Documents
                          </h3>
                          <div className="space-y-4">
                            {documents.passportPhoto && (
                              <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <Image className="h-5 w-5 text-blue-600" />
                                  <div>
                                    <p className="font-medium">Passport Photo</p>
                                    <p className="text-sm text-muted-foreground">{documents.passportPhoto.imageTitle}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Uploaded: {new Date(documents.passportPhoto.datePosted).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => window.open(documents.passportPhoto.imageUrl, '_blank')}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </div>
                            )}

                            {documents.idDocument && (
                              <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <FileText className="h-5 w-5 text-green-600" />
                                  <div>
                                    <p className="font-medium">ID Document</p>
                                    <p className="text-sm text-muted-foreground">{documents.idDocument.documentTitle}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Uploaded: {new Date(documents.idDocument.datePosted).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => window.open(documents.idDocument.fileUrl, '_blank')}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </div>
                            )}

                            {documents.bankConfirmationLetter && (
                              <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <FileText className="h-5 w-5 text-purple-600" />
                                  <div>
                                    <p className="font-medium">Bank Confirmation Letter</p>
                                    <p className="text-sm text-muted-foreground">{documents.bankConfirmationLetter.documentTitle}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Uploaded: {new Date(documents.bankConfirmationLetter.datePosted).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => window.open(documents.bankConfirmationLetter.fileUrl, '_blank')}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </div>
                            )}

                            {documents.proofOfPayment && (
                              <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <FileText className="h-5 w-5 text-orange-600" />
                                  <div>
                                    <p className="font-medium">Proof of Payment</p>
                                    <p className="text-sm text-muted-foreground">{documents.proofOfPayment.documentTitle}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Uploaded: {new Date(documents.proofOfPayment.datePosted).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => window.open(documents.proofOfPayment.fileUrl, '_blank')}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </div>
                            )}

                            {!documents.passportPhoto && !documents.idDocument && !documents.bankConfirmationLetter && !documents.proofOfPayment && (
                              <div className="text-center py-8 text-muted-foreground">
                                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>No documents uploaded yet</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {documents.memberDetails?.notes && (
                          <>
                            <Separator />
                            <div>
                              <h3 className="text-lg font-semibold mb-4">Admin Notes</h3>
                              <Textarea value={documents.memberDetails.notes} disabled rows={3} />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                  <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      {currentPage === 1 ? (
                        <ProfileFormPage1
                          form={form}
                          lookups={lookups}
                          handleChange={handleChange}
                          handleSelectChange={handleSelectChange}
                        />
                      ) : (
                        <DocumentUploadPage
                          documentUploads={documentUploads}
                          uploading={uploading}
                          updateDocumentUpload={updateDocumentUpload}
                          handleDocumentUpload={handleDocumentUpload}
                          documents={documents}
                        />
                      )}

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        {currentPage === 2 && (
                          <Button variant="outline" onClick={() => setCurrentPage(1)} className="w-full sm:w-auto">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Previous
                          </Button>
                        )}
                        <div className="flex flex-col gap-2 sm:flex-row sm:ml-auto w-full sm:w-auto">
                          <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="w-full sm:w-auto">
                            Cancel
                          </Button>
                          {currentPage === 1 ? (
                            <Button onClick={handleNextPage} className="w-full sm:w-auto">
                              Next: Documents
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          ) : (
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <Button variant="outline" onClick={uploadAllSelectedDocuments} disabled={saving} className="w-full sm:w-auto">
                                Upload All Selected
                              </Button>
                              <Button onClick={handleSubmitProfile} disabled={saving} className="w-full sm:w-auto">
                                <Save className="w-4 h-4 mr-2" />
                                {saving ? 'Saving...' : 'Save Changes'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              // Show create/edit form
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      {currentPage === 1 ? 'Step 1: Member Details' : 'Step 2: Upload Documents'}
                    </span>
                    <Badge variant="outline">{currentPage}/2</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentPage === 1 ? (
                    <ProfileFormPage1
                      form={form}
                      lookups={lookups}
                      handleChange={handleChange}
                      handleSelectChange={handleSelectChange}
                    />
                  ) : (
                    <DocumentUploadPage
                      documentUploads={documentUploads}
                      uploading={uploading}
                      updateDocumentUpload={updateDocumentUpload}
                      handleDocumentUpload={handleDocumentUpload}
                      documents={documents}
                    />
                  )}

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-6">
                    {currentPage === 2 && (
                      <Button variant="outline" onClick={() => setCurrentPage(1)} className="w-full sm:w-auto">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Previous
                      </Button>
                    )}
                    <div className="flex flex-col gap-2 sm:flex-row sm:ml-auto w-full sm:w-auto">
                      {currentPage === 1 ? (
                        <Button onClick={handleNextPage} className="w-full sm:w-auto">
                          Next: Documents
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      ) : (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button variant="outline" onClick={uploadAllSelectedDocuments} disabled={saving} className="w-full sm:w-auto">
                            Upload All Selected
                          </Button>
                          <Button onClick={handleSubmitProfile} disabled={saving} className="w-full sm:w-auto">
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? 'Saving...' : (isCreating ? 'Submit Profile' : 'Save Changes')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="performance">
            <div>
              <h2 className="text-xl font-semibold mb-4">Performance</h2>
              <p className="text-sm text-muted-foreground mb-4">Track how your music is performing across log sheets.</p>

              {performanceLoading ? (
                <div className="h-24 bg-muted rounded animate-pulse"></div>
              ) : !user ? (
                <Card>
                  <CardContent>Please sign in to view performance data.</CardContent>
                </Card>
              ) : (
                    <Card>
                      <CardContent>
                        {logSheets.length === 0 ? (
                          <p className="text-muted-foreground">No log sheets found.</p>
                        ) : (
                          <>
                            <div className="hidden sm:block overflow-x-auto">
                              <table className="w-full border-collapse border border-border rounded-lg">
                                <thead>
                                  <tr className="bg-muted">
                                    <th className="border border-border p-3 text-left">Date</th>
                                    <th className="border border-border p-3 text-left">LogSheet</th>
                                    <th className="border border-border p-3 text-left">Track</th>
                                    <th className="border border-border p-3 text-left">Company</th>
                                    <th className="border border-border p-3 text-left">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {logSheets.flatMap((ls) =>
                                    (ls.selectedMusic || [])
                                      .filter((m: any) => m.user?.id === user?.id)
                                      .map((m: any, idx: number) => (
                                        <tr key={`${ls.id}-${m.id}-${idx}`} className="hover:bg-muted/50">
                                          <td className="border border-border p-3">{new Date(ls.createdDate).toLocaleDateString()}</td>
                                          <td className="border border-border p-3">{ls.title}</td>
                                          <td className="border border-border p-3">{m.title || m.name || '-'}</td>
                                          <td className="border border-border p-3">{ls.company?.companyName || '-'}</td>
                                          <td className="border border-border p-3">
                                            <Button variant="outline" size="sm" onClick={() => navigate(`/company/logsheets/${ls.id}`)}>
                                              View LogSheet
                                            </Button>
                                          </td>
                                        </tr>
                                      ))
                                  )}
                                </tbody>
                              </table>
                            </div>

                            <div className="sm:hidden space-y-3">
                              {logSheets.flatMap((ls) =>
                                (ls.selectedMusic || [])
                                  .filter((m: any) => m.user?.id === user?.id)
                                  .map((m: any, idx: number) => (
                                    <div
                                      key={`${ls.id}-${m.id}-${idx}`}
                                      className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-2"
                                    >
                                      <div className="flex flex-col gap-1">
                                        <span className="text-xs font-semibold uppercase text-muted-foreground">Date</span>
                                        <span className="text-sm text-foreground">{new Date(ls.createdDate).toLocaleDateString()}</span>
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        <span className="text-xs font-semibold uppercase text-muted-foreground">LogSheet</span>
                                        <span className="text-sm text-foreground break-words">{ls.title}</span>
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        <span className="text-xs font-semibold uppercase text-muted-foreground">Track</span>
                                        <span className="text-sm text-foreground break-words">{m.title || m.name || '-'}</span>
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        <span className="text-xs font-semibold uppercase text-muted-foreground">Company</span>
                                        <span className="text-sm text-foreground">{ls.company?.companyName || '-'}</span>
                                      </div>
                                      <Button variant="outline" size="sm" className="w-full" onClick={() => navigate(`/company/logsheets/${ls.id}`)}>
                                        View LogSheet
                                      </Button>
                                    </div>
                                  ))
                              )}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

// Profile Form Page 1 Component
const ProfileFormPage1: React.FC<{
  form: MemberDetailsForm;
  lookups: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (name: string, value: string) => void;
}> = ({ form, lookups, handleChange, handleSelectChange }) => (
  <div className="space-y-6">
    {/* Personal Information */}
    <div>
      <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="titleId">Title</Label>
          <Select value={form.titleId?.toString() || ''} onValueChange={(value) => handleSelectChange('titleId', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select title" />
            </SelectTrigger>
            <SelectContent>
              {lookups.titles.map((title: any) => (
                <SelectItem key={title.id} value={title.id.toString()}>{title.titleName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="firstName">First Name *</Label>
          <Input 
            id="firstName" 
            name="firstName" 
            value={form.firstName} 
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor="surname">Surname *</Label>
          <Input 
            id="surname" 
            name="surname" 
            value={form.surname} 
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input 
            id="email" 
            name="email" 
            type="email"
            value={form.email} 
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor="phoneNumber">Phone Number *</Label>
          <Input 
            id="phoneNumber" 
            name="phoneNumber" 
            value={form.phoneNumber} 
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor="idNumber">ID Number</Label>
          <Input 
            id="idNumber" 
            name="idNumber" 
            type="number"
            value={form.idNumber || ''} 
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="pseudonym">Pseudonym</Label>
          <Input 
            id="pseudonym" 
            name="pseudonym" 
            value={form.pseudonym || ''} 
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="groupNameORStageName">Group/Stage Name</Label>
          <Input 
            id="groupNameORStageName" 
            name="groupNameORStageName" 
            value={form.groupNameORStageName || ''} 
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="genderId">Gender</Label>
          <Select value={form.genderId?.toString() || ''} onValueChange={(value) => handleSelectChange('genderId', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              {lookups.genders.map((gender: any) => (
                <SelectItem key={gender.id} value={gender.id.toString()}>{gender.genderName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="maritalStatusId">Marital Status</Label>
          <Select value={form.maritalStatusId?.toString() || ''} onValueChange={(value) => handleSelectChange('maritalStatusId', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select marital status" />
            </SelectTrigger>
            <SelectContent>
              {lookups.maritalStatuses.map((status: any) => (
                <SelectItem key={status.id} value={status.id.toString()}>{status.statusName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="memberCategoryId">Member Category</Label>
          <Select value={form.memberCategoryId?.toString() || ''} onValueChange={(value) => handleSelectChange('memberCategoryId', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {lookups.memberCategories.map((category: any) => (
                <SelectItem key={category.id} value={category.id.toString()}>{category.categoryName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="noOFDependents">Number of Dependents</Label>
          <Input 
            id="noOFDependents" 
            name="noOFDependents" 
            type="number"
            value={form.noOFDependents || ''} 
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="typeOfWork">Type of Work</Label>
          <Input 
            id="typeOfWork" 
            name="typeOfWork" 
            value={form.typeOfWork || ''} 
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="birthDate">Birth Date</Label>
          <Input 
            id="birthDate" 
            name="birthDate" 
            type="date"
            value={form.birthDate || ''} 
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="placeOfBirth">Place of Birth</Label>
          <Input 
            id="placeOfBirth" 
            name="placeOfBirth" 
            value={form.placeOfBirth || ''} 
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="idOrPassportNumber">ID/Passport Number</Label>
          <Input 
            id="idOrPassportNumber" 
            name="idOrPassportNumber" 
            value={form.idOrPassportNumber || ''} 
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="nationality">Nationality</Label>
          <Input 
            id="nationality" 
            name="nationality" 
            value={form.nationality || ''} 
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="occupation">Occupation</Label>
          <Input 
            id="occupation" 
            name="occupation" 
            value={form.occupation || ''} 
            onChange={handleChange}
          />
        </div>
      </div>
    </div>

    <Separator />

    {/* Address Information */}
    <div>
      <h3 className="text-lg font-semibold mb-4">Address Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="line1">Address Line 1</Label>
          <Input 
            id="line1" 
            name="line1" 
            value={form.line1 || ''} 
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="line2">Address Line 2</Label>
          <Input 
            id="line2" 
            name="line2" 
            value={form.line2 || ''} 
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input 
            id="city" 
            name="city" 
            value={form.city || ''} 
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="region">Region</Label>
          <Input 
            id="region" 
            name="region" 
            value={form.region || ''} 
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="poBox">PO Box</Label>
          <Input 
            id="poBox" 
            name="poBox" 
            value={form.poBox || ''} 
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="postalCode">Postal Code</Label>
          <Input 
            id="postalCode" 
            name="postalCode" 
            value={form.postalCode || ''} 
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="country">Country</Label>
          <Input 
            id="country" 
            name="country" 
            value={form.country || ''} 
            onChange={handleChange}
          />
        </div>
      </div>
    </div>

    <Separator />

    {/* Employment Information */}
    <div>
      <h3 className="text-lg font-semibold mb-4">Employment Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="nameOfEmployer">Employer Name</Label>
          <Input 
            id="nameOfEmployer" 
            name="nameOfEmployer" 
            value={form.nameOfEmployer || ''} 
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="addressOfEmployer">Employer Address</Label>
          <Input 
            id="addressOfEmployer" 
            name="addressOfEmployer" 
            value={form.addressOfEmployer || ''} 
            onChange={handleChange}
          />
        </div>
      </div>
    </div>

    <Separator />

    {/* Band Information */}
    <div>
      <h3 className="text-lg font-semibold mb-4">Band Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="nameOfTheBand">Band Name</Label>
          <Input 
            id="nameOfTheBand" 
            name="nameOfTheBand" 
            value={form.nameOfTheBand || ''} 
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="dateFounded">Date Founded</Label>
          <Input 
            id="dateFounded" 
            name="dateFounded" 
            type="date"
            value={form.dateFounded || ''} 
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="numberOfBand">Number of Band Members</Label>
          <Input 
            id="numberOfBand" 
            name="numberOfBand" 
            type="number"
            value={form.numberOfBand || ''} 
            onChange={handleChange}
          />
        </div>
      </div>
    </div>

    <Separator />

    {/* Banking Information */}
    <div>
      <h3 className="text-lg font-semibold mb-4">Banking Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="bankNameId">Bank Name</Label>
          <Select value={form.bankNameId?.toString() || ''} onValueChange={(value) => handleSelectChange('bankNameId', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select bank" />
            </SelectTrigger>
            <SelectContent>
              {lookups.bankNames.map((bank: any) => (
                <SelectItem key={bank.id} value={bank.id.toString()}>{bank.bankName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="accountHolderName">Account Holder Name</Label>
          <Input 
            id="accountHolderName" 
            name="accountHolderName" 
            value={form.accountHolderName || ''} 
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="bankAccountNumber">Bank Account Number</Label>
          <Input 
            id="bankAccountNumber" 
            name="bankAccountNumber" 
            value={form.bankAccountNumber || ''} 
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="bankAccountType">Bank Account Type</Label>
          <Input 
            id="bankAccountType" 
            name="bankAccountType" 
            value={form.bankAccountType || ''} 
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="bankBranchName">Bank Branch Name</Label>
          <Input 
            id="bankBranchName" 
            name="bankBranchName" 
            value={form.bankBranchName || ''} 
            onChange={handleChange}
          />
        </div>
        <div>
          <Label htmlFor="bankBranchNumber">Bank Branch Number</Label>
          <Input 
            id="bankBranchNumber" 
            name="bankBranchNumber" 
            value={form.bankBranchNumber || ''} 
            onChange={handleChange}
          />
        </div>
      </div>
    </div>
  </div>
);

// Document Upload Page Component
const DocumentUploadPage: React.FC<{
  documentUploads: Record<string, { file: File | null; title: string }>;
  uploading: Record<string, boolean>;
  updateDocumentUpload: (documentType: string, field: 'file' | 'title', value: any) => void;
  handleDocumentUpload: (documentType: string) => Promise<void>;
  documents: any;
}> = ({ documentUploads, uploading, updateDocumentUpload, handleDocumentUpload, documents }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold mb-4">Upload Required Documents</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Upload all required documents to complete your profile submission
      </p>
    </div>

    {/* Passport Photo */}
    <Card className="border-dashed">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Image className="h-5 w-5" />
          Passport Photo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Document Title</Label>
          <Input
            value={documentUploads.passportPhoto.title}
            onChange={(e) => updateDocumentUpload('passportPhoto', 'title', e.target.value)}
            placeholder="Enter document title"
          />
        </div>
        <div className="space-y-2">
          <Label>Select Image File</Label>
          <Input 
            type="file" 
            accept="image/*" 
            onChange={(e) => updateDocumentUpload('passportPhoto', 'file', e.target.files?.[0] || null)} 
          />
        </div>
        {documentUploads.passportPhoto.file && (
          <div className="text-sm p-3 bg-muted rounded-lg">
            <p className="font-medium">{documentUploads.passportPhoto.file.name}</p>
            <p className="text-muted-foreground">Size: {(documentUploads.passportPhoto.file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        )}
        <div className="flex gap-2">
          <Button 
            onClick={() => handleDocumentUpload('passportPhoto')}
            disabled={!documentUploads.passportPhoto.file || uploading.passportPhoto}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading.passportPhoto ? 'Uploading...' : 'Upload Photo'}
          </Button>
          {documents?.passportPhoto && (
            <Button variant="outline" onClick={() => window.open(documents.passportPhoto.imageUrl, '_blank')}>
              <Eye className="h-4 w-4 mr-2" />
              View Current
            </Button>
          )}
        </div>
      </CardContent>
    </Card>

    {/* ID Document */}
    <Card className="border-dashed">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          ID Document
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Document Title</Label>
          <Input
            value={documentUploads.idDocument.title}
            onChange={(e) => updateDocumentUpload('idDocument', 'title', e.target.value)}
            placeholder="Enter document title"
          />
        </div>
        <div className="space-y-2">
          <Label>Select PDF File</Label>
          <Input 
            type="file" 
            accept="application/pdf" 
            onChange={(e) => updateDocumentUpload('idDocument', 'file', e.target.files?.[0] || null)} 
          />
        </div>
        {documentUploads.idDocument.file && (
          <div className="text-sm p-3 bg-muted rounded-lg">
            <p className="font-medium">{documentUploads.idDocument.file.name}</p>
            <p className="text-muted-foreground">Size: {(documentUploads.idDocument.file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        )}
        <div className="flex gap-2">
          <Button 
            onClick={() => handleDocumentUpload('idDocument')}
            disabled={!documentUploads.idDocument.file || uploading.idDocument}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading.idDocument ? 'Uploading...' : 'Upload Document'}
          </Button>
          {documents?.idDocument && (
            <Button variant="outline" onClick={() => window.open(documents.idDocument.fileUrl, '_blank')}>
              <Eye className="h-4 w-4 mr-2" />
              View Current
            </Button>
          )}
        </div>
      </CardContent>
    </Card>

    {/* Bank Confirmation Letter */}
    <Card className="border-dashed">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Bank Confirmation Letter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Document Title</Label>
          <Input
            value={documentUploads.bankConfirmationLetter.title}
            onChange={(e) => updateDocumentUpload('bankConfirmationLetter', 'title', e.target.value)}
            placeholder="Enter document title"
          />
        </div>
        <div className="space-y-2">
          <Label>Select PDF File</Label>
          <Input 
            type="file" 
            accept="application/pdf" 
            onChange={(e) => updateDocumentUpload('bankConfirmationLetter', 'file', e.target.files?.[0] || null)} 
          />
        </div>
        {documentUploads.bankConfirmationLetter.file && (
          <div className="text-sm p-3 bg-muted rounded-lg">
            <p className="font-medium">{documentUploads.bankConfirmationLetter.file.name}</p>
            <p className="text-muted-foreground">Size: {(documentUploads.bankConfirmationLetter.file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        )}
        <div className="flex gap-2">
          <Button 
            onClick={() => handleDocumentUpload('bankConfirmationLetter')}
            disabled={!documentUploads.bankConfirmationLetter.file || uploading.bankConfirmationLetter}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading.bankConfirmationLetter ? 'Uploading...' : 'Upload Letter'}
          </Button>
          {documents?.bankConfirmationLetter && (
            <Button variant="outline" onClick={() => window.open(documents.bankConfirmationLetter.fileUrl, '_blank')}>
              <Eye className="h-4 w-4 mr-2" />
              View Current
            </Button>
          )}
        </div>
      </CardContent>
    </Card>

    {/* Proof of Payment */}
    <Card className="border-dashed">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Proof of Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Document Title</Label>
          <Input
            value={documentUploads.proofOfPayment.title}
            onChange={(e) => updateDocumentUpload('proofOfPayment', 'title', e.target.value)}
            placeholder="Enter document title"
          />
        </div>
        <div className="space-y-2">
          <Label>Select PDF File</Label>
          <Input 
            type="file" 
            accept="application/pdf" 
            onChange={(e) => updateDocumentUpload('proofOfPayment', 'file', e.target.files?.[0] || null)} 
          />
        </div>
        {documentUploads.proofOfPayment.file && (
          <div className="text-sm p-3 bg-muted rounded-lg">
            <p className="font-medium">{documentUploads.proofOfPayment.file.name}</p>
            <p className="text-muted-foreground">Size: {(documentUploads.proofOfPayment.file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        )}
        <div className="flex gap-2">
          <Button 
            onClick={() => handleDocumentUpload('proofOfPayment')}
            disabled={!documentUploads.proofOfPayment.file || uploading.proofOfPayment}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading.proofOfPayment ? 'Uploading...' : 'Upload Proof'}
          </Button>
          {documents?.proofOfPayment && (
            <Button variant="outline" onClick={() => window.open(documents.proofOfPayment.fileUrl, '_blank')}>
              <Eye className="h-4 w-4 mr-2" />
              View Current
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  </div>
);

export default ArtistProfile;
