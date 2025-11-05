import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  accessor: keyof T | ((item: T) => any);
  render?: (value: any, item: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  className?: string;
}

export interface Action<T> {
  label: string;
  icon?: React.ElementType;
  onClick: (item: T) => void;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  disabled?: (item: T) => boolean;
  show?: (item: T) => boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  filterable?: boolean;
  exportable?: boolean;
  pagination?: boolean;
  showPagination?: boolean;
  pageSize?: number;
  title?: string;
  description?: string;
  emptyMessage?: string;
  className?: string;
}

function DataTable<T extends Record<string, any>>({
  data,
  columns,
  actions = [],
  loading = false,
  searchable = true,
  searchPlaceholder = "Search...",
  filterable = false,
  exportable = false,
  pagination = true,
  showPagination = true,
  pageSize = 10,
  title,
  description,
  emptyMessage = 'No data available',
  className = '',
}: DataTableProps<T>) {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{
      key: string;
      direction: 'asc' | 'desc';
    } | null>(null);
    const [playingItem, setPlayingItem] = useState<string | null>(null);
    const isMobile = useIsMobile();

  // Filter and search data
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter((item) =>
      columns.some((column) => {
        const value = typeof column.accessor === 'function' 
          ? column.accessor(item)
          : item[column.accessor as keyof T];
        return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
      })
    );
  }, [data, searchTerm, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

    // Paginate data
    const computedPageSize = useMemo(() => {
      const safePageSize = Math.max(1, pageSize || 1);
      return isMobile ? Math.min(safePageSize, 6) : safePageSize;
    }, [isMobile, pageSize]);

    const paginatedData = useMemo(() => {
      if (!pagination) return sortedData;

      const start = (currentPage - 1) * computedPageSize;
      const end = start + computedPageSize;
      return sortedData.slice(start, end);
    }, [sortedData, currentPage, computedPageSize, pagination]);

    const totalPages = pagination ? Math.max(1, Math.ceil(sortedData.length / computedPageSize)) : 1;

    useEffect(() => {
      if (!pagination) {
        if (currentPage !== 1) {
          setCurrentPage(1);
        }
        return;
      }

      const nextTotalPages = Math.max(1, Math.ceil(sortedData.length / computedPageSize));
      if (currentPage > nextTotalPages) {
        setCurrentPage(nextTotalPages);
      }
    }, [pagination, sortedData.length, computedPageSize, currentPage]);

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const handlePlay = async (item: any) => {
    if (playingItem === item.id) {
      setPlayingItem(null);
      // Stop audio
    } else {
      setPlayingItem(item.id);
      // Play audio
      if (item.fileUrl) {
        const audio = new Audio(item.fileUrl);
        audio.play().catch(console.error);
      }
    }
  };

  const handleDownload = async (item: any) => {
    if (item.fileUrl && item.title) {
      try {
        const link = document.createElement('a');
        link.href = item.fileUrl;
        link.download = `${item.title}.${item.fileType || 'mp3'}`;
        link.click();
        link.href = item.fileUrl;
        link.download = `${item.title}.${item.fileType || 'mp3'}`;
        link.click();
      } catch (error) {
        console.error('Download failed:', error);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      APPROVED: { variant: 'default' as const, className: 'bg-namsa-success text-white' },
      PENDING: { variant: 'secondary' as const, className: 'bg-namsa-warning text-white' },
      REJECTED: { variant: 'destructive' as const, className: 'bg-namsa-error text-white' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;

    return (
      <Badge variant={config.variant} className={`${config.className} hover-scale`}>
        {status === 'APPROVED' && <CheckCircle className="w-3 h-3 mr-1" />}
        {status === 'PENDING' && <Clock className="w-3 h-3 mr-1" />}
        {status === 'REJECTED' && <XCircle className="w-3 h-3 mr-1" />}
        {status}
      </Badge>
    );
  };

  const renderCellValue = (column: Column<T>, item: T) => {
    const value = typeof column.accessor === 'function' 
      ? column.accessor(item)
      : item[column.accessor as keyof T];

    if (column.render) {
      return column.render(value, item);
    }

    // Special handling for common field types
    if (column.key === 'status' && typeof value === 'object') {
      const statusName = (value?.statusName || value?.status || '').toString().toUpperCase();
      if (statusName) return getStatusBadge(statusName);
    }

    if (column.key === 'uploadedDate' || column.key === 'createdAt' || column.key === 'dateRecorded') {
      return value ? new Date(value).toLocaleDateString() : '-';
    }

    if (column.key === 'fileUrl' && value) {
      return (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePlay(item)}
            className="hover-scale"
          >
            {playingItem === item.id ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDownload(item)}
            className="hover-scale"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      );
    }

    return value || '-';
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasToolbar = Boolean(title || description || searchable || filterable || exportable);

    return (
      <Card className={cn('animate-fade-in rounded-2xl border border-border/70 bg-card/95 shadow-sm', className)}>
      <CardContent className="p-0">
        {/* Header */}
        {hasToolbar && (
          <div className="border-b border-border/80 p-4 sm:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                {title && <h3 className="text-base font-semibold text-foreground sm:text-lg">{title}</h3>}
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                {searchable && (
                  <div className="relative w-full sm:w-auto">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={searchPlaceholder}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full rounded-lg border-border/70 bg-card/80 pl-9 pr-3 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-primary sm:w-56 md:w-64"
                    />
                  </div>
                )}

                {filterable && (
                  <Button variant="outline" size="sm" className="w-full sm:w-auto hover-scale">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                )}

                {exportable && (
                  <Button variant="outline" size="sm" className="w-full sm:w-auto hover-scale">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

          {/* Table - desktop */}
            <div className="hidden sm:block">
            <div className="overflow-x-auto">
              <Table className="data-table min-w-full">
                <TableHeader>
                  <TableRow>
                    {columns.map((column, i) => (
                      <TableHead
                        key={i}
                        className={cn(
                          'whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-muted-foreground/90',
                          column.width,
                          column.className,
                          column.sortable && 'cursor-pointer select-none hover:bg-muted/60'
                        )}
                        onClick={() => column.sortable && handleSort(column.key as string)}
                      >
                        <div className="flex items-center space-x-1">
                          <span>{column.header}</span>
                          {column.sortable && sortConfig?.key === column.key && (
                            <span className="text-xs">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </TableHead>
                    ))}
                    {actions.length > 0 && (
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground/90">
                        Actions
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((item, index) => (
                      <TableRow
                        key={index}
                        className="transition-colors duration-200 hover:bg-muted/30"
                      >
                        {columns.map((column, i) => (
                          <TableCell
                            key={i}
                            className={cn('align-top break-words text-sm text-foreground', column.className)}
                          >
                            {renderCellValue(column, item)}
                          </TableCell>
                        ))}
                        {actions.length > 0 && (
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover-scale"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="animate-scale-in">
                                {actions.map((action, actionIndex) => {
                                  const shouldShow = action.show ? action.show(item) : true;
                                  const isDisabled = action.disabled ? action.disabled(item) : false;

                                  if (!shouldShow) return null;

                                  return (
                                    <React.Fragment key={actionIndex}>
                                      <DropdownMenuItem
                                        onClick={() => !isDisabled && action.onClick(item)}
                                        disabled={isDisabled}
                                        className={cn(
                                          'cursor-pointer',
                                          action.variant === 'destructive'
                                            ? 'text-destructive focus:text-destructive'
                                            : action.variant === 'success'
                                            ? 'text-namsa-success focus:text-namsa-success'
                                            : action.variant === 'warning'
                                            ? 'text-namsa-warning focus:text-namsa-warning'
                                            : undefined
                                        )}
                                      >
                                        {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                                        {action.label}
                                      </DropdownMenuItem>
                                      {actionIndex < actions.length - 1 && <DropdownMenuSeparator />}
                                    </React.Fragment>
                                  );
                                })}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                        className="py-12 text-center text-muted-foreground"
                      >
                        {emptyMessage}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile card view */}
            <div className="sm:hidden">
              {paginatedData.length > 0 ? (
                <div className="space-y-4">
                  {paginatedData.map((item, index) => {
                    const primaryColumn = columns[0];
                    const secondaryColumns = columns.slice(1);

                    return (
                      <div
                        key={index}
                        className="space-y-4 rounded-2xl border border-border/70 bg-card/95 p-4 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-lg"
                      >
                        {primaryColumn && (
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground/80">
                                {primaryColumn.header}
                              </span>
                              <div className="text-base font-semibold leading-snug text-foreground">
                                {renderCellValue(primaryColumn, item)}
                              </div>
                            </div>
                          </div>
                        )}

                        {secondaryColumns.length > 0 && (
                          <div className="grid gap-3">
                            {secondaryColumns.map((column, columnIndex) => (
                              <div key={columnIndex} className="flex flex-col gap-1">
                                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/90">
                                  {column.header}
                                </span>
                                <div className="break-words text-sm leading-relaxed text-foreground">
                                  {renderCellValue(column, item)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {actions.length > 0 && (
                          <div className="flex flex-wrap gap-2 border-t border-border/50 pt-2">
                            {actions.map((action, actionIndex) => {
                              const shouldShow = action.show ? action.show(item) : true;
                              const isDisabled = action.disabled ? action.disabled(item) : false;
                              if (!shouldShow) return null;

                              return (
                                <Button
                                  key={actionIndex}
                                  variant={
                                    action.variant === 'destructive'
                                      ? 'destructive'
                                      : action.variant === 'success'
                                      ? 'secondary'
                                      : 'outline'
                                  }
                                  size="sm"
                                  className="flex-1 min-w-[48%]"
                                  onClick={() => !isDisabled && action.onClick(item)}
                                  disabled={isDisabled}
                                >
                                  {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                                  {action.label}
                                </Button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/80 p-6 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              )}
            </div>

          {/* Pagination */}
          {showPagination && pagination && totalPages > 1 && (
            <div className="border-t border-border/80 p-4 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                    Showing {Math.min((currentPage - 1) * computedPageSize + 1, sortedData.length)} to{' '}
                    {Math.min(currentPage * computedPageSize, sortedData.length)} of {sortedData.length} results
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="hover-scale"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="flex flex-wrap items-center gap-1">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      const page = currentPage - 2 + i;
                      if (page < 1 || page > totalPages) return null;

                      return (
                        <Button
                          key={page}
                          variant={page === currentPage ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            'h-8 w-8 p-0 hover-scale',
                            page === currentPage && 'bg-gradient-namsa text-primary-foreground'
                          )}
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="hover-scale"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
      </CardContent>
    </Card>
  );
}

export default DataTable;
