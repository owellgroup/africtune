import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable, { Column, Action } from '@/components/common/DataTable';
import { licenseAPI } from '@/services/api';
import { LegalEntity, NaturalPersonEntity } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Building2, User, Eye, CheckCircle, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const AdminLicenseApplications: React.FC = () => {
  const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([]);
  const [naturalPersons, setNaturalPersons] = useState<NaturalPersonEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'legal' | 'natural' | null>(null);
  const [selectedLegal, setSelectedLegal] = useState<LegalEntity | null>(null);
  const [selectedNatural, setSelectedNatural] = useState<NaturalPersonEntity | null>(null);

  const dialogTitle = useMemo(() => {
    if (viewMode === 'legal') return 'Legal Entity Application Details';
    if (viewMode === 'natural') return 'Natural Person Application Details';
    return 'Application Details';
  }, [viewMode]);

  useEffect(() => {
    const loadApplications = async () => {
      try {
        setLoading(true);
        const [legalData, naturalData] = await Promise.all([
          licenseAPI.getAllLegalEntities(),
          licenseAPI.getAllNaturalPersons(),
        ]);
        setLegalEntities(legalData);
        setNaturalPersons(naturalData);
      } catch (error) {
        console.error('Failed to load license applications:', error);
        toast({
          title: "Error",
          description: "Failed to load license applications",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadApplications();
  }, [toast]);

  const resetDialogState = () => {
    setSelectedLegal(null);
    setSelectedNatural(null);
    setViewMode(null);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setViewDialogOpen(open);
    if (!open) {
      resetDialogState();
    }
  };

  const openLegalDialog = (item: LegalEntity) => {
    setSelectedLegal(item);
    setSelectedNatural(null);
    setViewMode('legal');
    setViewDialogOpen(true);
  };

  const openNaturalDialog = (item: NaturalPersonEntity) => {
    setSelectedNatural(item);
    setSelectedLegal(null);
    setViewMode('natural');
    setViewDialogOpen(true);
  };

  const formatDisplay = (value: any): string => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value.toString() : '-';
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return String(value);
  };

  const formatDateString = (value: string | null | undefined): string => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString();
    }
    return value;
  };

  const resolveVatStatus = (entity: LegalEntity): string => {
    const vatStatus: any = (entity as any).vatStatus;
    if (!vatStatus) return '-';
    if (typeof vatStatus === 'string') return formatDisplay(vatStatus);
    if (typeof vatStatus === 'object') {
      return formatDisplay(
        vatStatus.statusName ?? vatStatus.status ?? vatStatus.name ?? vatStatus.value ?? '-'
      );
    }
    return formatDisplay(vatStatus);
  };

  const resolveVatNumber = (entity: LegalEntity): string => {
    const value = (entity as any).vatNumber ?? (entity as any).vatNo ?? (entity as any).vat_number;
    return formatDisplay(value);
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

  const renderLegalDetails = () => {
    if (!selectedLegal) return null;
    const legal = selectedLegal;

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Company Information</h3>
          {renderInfoGrid([
            { label: 'Application ID', value: formatDisplay(legal.id) },
            { label: 'Company Name', value: formatDisplay(legal.companyName) },
            { label: 'Short Name', value: formatDisplay(legal.companyShortName) },
            { label: 'Registration Number', value: formatDisplay(legal.registrationNumber) },
            { label: 'VAT Status', value: resolveVatStatus(legal) },
            { label: 'VAT Number', value: resolveVatNumber(legal) },
            { label: 'Number of Premises', value: formatDisplay(legal.numberOfPremises) },
          ])}
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-semibold mb-4">Ownership Details</h3>
          {renderInfoGrid([
            { label: 'Owner Title', value: formatDisplay(legal.ownerTitle?.titleName) },
            { label: 'Owner First Name', value: formatDisplay(legal.ownerFirstName) },
            { label: 'Owner Last Name', value: formatDisplay(legal.ownerLastName) },
            { label: 'Owner Email', value: formatDisplay(legal.ownerEmail) },
            { label: 'Owner Phone', value: formatDisplay(legal.ownerPhone) },
          ])}
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-semibold mb-4">Address Details</h3>
          {renderInfoGrid([
            { label: 'Building Name', value: formatDisplay(legal.buildingName) },
            { label: 'Unit No / Shop', value: formatDisplay(legal.unitNoOrShop) },
            { label: 'Street', value: formatDisplay(legal.street) },
            { label: 'Suburb', value: formatDisplay(legal.suburb) },
            { label: 'City / Town', value: formatDisplay(legal.cityOrTown) },
            { label: 'Country', value: formatDisplay(legal.country) },
            { label: 'Postal Code', value: formatDisplay(legal.postalCode) },
          ])}
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-semibold mb-4">Music Usage</h3>
          {renderInfoGrid([
            { label: 'Usage Type', value: formatDisplay(legal.musicUsageType?.usageType) },
            { label: 'Source of Music', value: formatDisplay(legal.sourceOfMusic?.sourceOfMusic) },
          ])}
        </div>
      </div>
    );
  };

  const renderNaturalDetails = () => {
    if (!selectedNatural) return null;
    const natural = selectedNatural;

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Applicant Information</h3>
          {renderInfoGrid([
            { label: 'Application ID', value: formatDisplay(natural.id) },
            { label: 'Title', value: formatDisplay(natural.title?.titleName) },
            { label: 'First Name', value: formatDisplay(natural.firstName) },
            { label: 'Surname', value: formatDisplay(natural.surname) },
            { label: 'ID Number', value: formatDisplay(natural.idNumber) },
            { label: 'Business Role / Title', value: formatDisplay(natural.businessRoleOrTitle) },
          ])}
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-semibold mb-4">Contact Details</h3>
          {renderInfoGrid([
            { label: 'Email', value: formatDisplay(natural.email) },
            { label: 'Phone', value: formatDisplay(natural.phone) },
            { label: 'Fax', value: formatDisplay(natural.fax) },
          ])}
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-semibold mb-4">Business & Usage Details</h3>
          {renderInfoGrid([
            { label: 'Trading Name of Business', value: formatDisplay(natural.tradingNameOfBusiness) },
            { label: 'Number of Premises', value: formatDisplay(natural.numberOfPremises) },
            { label: 'Commencement Date', value: formatDateString(natural.commencementDate) },
            { label: 'Usage Type', value: formatDisplay(natural.musicUsageType?.usageType) },
            { label: 'Source of Music', value: formatDisplay(natural.sourceOfMusic?.sourceOfMusic) },
          ])}
        </div>

        <Separator />

        <div>
          <h3 className="text-lg font-semibold mb-4">Address Details</h3>
          {renderInfoGrid([
            { label: 'Address Location', value: formatDisplay(natural.addressLocation) },
            { label: 'Unit Number', value: formatDisplay(natural.unitNo) },
            { label: 'Street', value: formatDisplay(natural.street) },
            { label: 'Suburb', value: formatDisplay(natural.suburb) },
            { label: 'City / Town', value: formatDisplay(natural.cityOrTown) },
            { label: 'Province', value: formatDisplay(natural.province) },
            { label: 'Country', value: formatDisplay(natural.country) },
            { label: 'Postal Code', value: formatDisplay(natural.postalCode) },
          ])}
        </div>
      </div>
    );
  };

  const legalEntityColumns: Column<LegalEntity>[] = [
    {
      key: 'companyName',
      header: 'Company Name',
      accessor: 'companyName',
      className: 'font-medium',
    },
    {
      key: 'companyShortName',
      header: 'Short Name',
      accessor: 'companyShortName',
    },
    {
      key: 'registrationNumber',
      header: 'Registration No.',
      accessor: 'registrationNumber',
    },
    {
      key: 'ownerFirstName',
      header: 'Owner',
      accessor: (item) => `${item.ownerFirstName} ${item.ownerLastName}`,
    },
    {
      key: 'ownerEmail',
      header: 'Contact Email',
      accessor: 'ownerEmail',
    },
    {
      key: 'cityOrTown',
      header: 'Location',
      accessor: 'cityOrTown',
    },
    {
      key: 'musicUsageType',
      header: 'Usage Type',
      accessor: (item) => item.musicUsageType?.usageType || '-',
    },
  ];

  const naturalPersonColumns: Column<NaturalPersonEntity>[] = [
    {
      key: 'firstName',
      header: 'First Name',
      accessor: 'firstName',
      className: 'font-medium',
    },
    {
      key: 'surname',
      header: 'Surname',
      accessor: 'surname',
    },
    {
      key: 'idNumber',
      header: 'ID Number',
      accessor: 'idNumber',
    },
    {
      key: 'email',
      header: 'Email',
      accessor: 'email',
    },
    {
      key: 'phone',
      header: 'Phone',
      accessor: 'phone',
    },
    {
      key: 'cityOrTown',
      header: 'Location',
      accessor: 'cityOrTown',
    },
    {
      key: 'tradingNameOfBusiness',
      header: 'Business Name',
      accessor: 'tradingNameOfBusiness',
    },
  ];

  const legalEntityActions: Action<LegalEntity>[] = [
    {
      label: 'View Details',
      icon: Eye,
      onClick: (item) => {
        openLegalDialog(item);
      },
    },
    {
      label: 'Approve',
      icon: CheckCircle,
      variant: 'success',
      onClick: async (item) => {
        if (window.confirm(`Approve license application for ${item.companyName}?`)) {
          toast({
            title: "Application Approved",
            description: `License approved for ${item.companyName}`,
          });
        }
      },
    },
    {
      label: 'Reject',
      icon: XCircle,
      variant: 'destructive',
      onClick: async (item) => {
        const reason = window.prompt('Enter rejection reason:');
        if (reason) {
          toast({
            title: "Application Rejected",
            description: `License rejected for ${item.companyName}`,
          });
        }
      },
    },
  ];

  const naturalPersonActions: Action<NaturalPersonEntity>[] = [
    {
      label: 'View Details',
      icon: Eye,
      onClick: (item) => {
        openNaturalDialog(item);
      },
    },
    {
      label: 'Approve',
      icon: CheckCircle,
      variant: 'success',
      onClick: async (item) => {
        if (window.confirm(`Approve license application for ${item.firstName} ${item.surname}?`)) {
          toast({
            title: "Application Approved",
            description: `License approved for ${item.firstName} ${item.surname}`,
          });
        }
      },
    },
    {
      label: 'Reject',
      icon: XCircle,
      variant: 'destructive',
      onClick: async (item) => {
        const reason = window.prompt('Enter rejection reason:');
        if (reason) {
          toast({
            title: "Application Rejected",
            description: `License rejected for ${item.firstName} ${item.surname}`,
          });
        }
      },
    },
  ];

  return (
    <DashboardLayout title="License Applications">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">License Applications</h1>
          <p className="text-muted-foreground">
            Review and manage license applications from legal entities and natural persons
          </p>
        </div>

        <Tabs defaultValue="legal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="legal" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Legal Entities ({legalEntities.length})
            </TabsTrigger>
            <TabsTrigger value="natural" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Natural Persons ({naturalPersons.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="legal">
            <Card>
              <CardHeader>
                <CardTitle>Legal Entity Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={legalEntities}
                  columns={legalEntityColumns}
                  actions={legalEntityActions}
                  loading={loading}
                  searchable={true}
                  emptyMessage="No legal entity applications"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="natural">
            <Card>
              <CardHeader>
                <CardTitle>Natural Person Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={naturalPersons}
                  columns={naturalPersonColumns}
                  actions={naturalPersonActions}
                  loading={loading}
                  searchable={true}
                  emptyMessage="No natural person applications"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={viewDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{dialogTitle}</DialogTitle>
            </DialogHeader>
            {viewMode === 'legal' && renderLegalDetails()}
            {viewMode === 'natural' && renderNaturalDetails()}
            {!viewMode && (
              <p className="text-muted-foreground">Select an application to view its details.</p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminLicenseApplications;