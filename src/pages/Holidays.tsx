import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Calendar,
  AlertTriangle,
  Tag
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: string;
  createdAt?: string;
}

const HolidaysPage = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  
  const [holidayForm, setHolidayForm] = useState({
    name: '',
    date: '',
    type: 'Regular'
  });

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/holidays');
      if (!res.ok) throw new Error('Failed to fetch holidays');
      const data = await res.json();
      setHolidays(data || []);
    } catch (err: any) {
      toast.error('Failed to load holidays');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingHoliday(null);
    setHolidayForm({
      name: '',
      date: '',
      type: 'Regular'
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setHolidayForm({
      name: holiday.name,
      date: holiday.date,
      type: holiday.type
    });
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (holiday: Holiday) => {
    setHolidayToDelete(holiday);
    setIsDeleteOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayForm.name.trim() || !holidayForm.date) {
      toast.error('All fields are required');
      return;
    }

    try {
      const url = editingHoliday ? `/api/holidays/${editingHoliday.id}` : '/api/holidays';
      const method = editingHoliday ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(holidayForm)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save holiday');
      }

      toast.success(editingHoliday ? 'Holiday updated successfully' : 'Holiday added successfully');
      setIsDialogOpen(false);
      fetchHolidays();
    } catch (err: any) {
      toast.error(err.message || 'Error occurred while saving');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!holidayToDelete) return;
    try {
      const res = await fetch(`/api/holidays/${holidayToDelete.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete holiday');
      
      toast.success('Holiday deleted successfully');
      setIsDeleteOpen(false);
      setHolidayToDelete(null);
      fetchHolidays();
    } catch (err: any) {
      toast.error('Failed to delete holiday');
    }
  };

  const filteredHolidays = holidays.filter(hol => {
    const matchesSearch = hol.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          hol.date.includes(searchTerm);
    const matchesType = filterType === 'all' || hol.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6" id="holidays-dashboard-container">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 font-sans">Public Holidays</h1>
          <p className="text-sm text-neutral-500 font-sans mt-0.5">Manage academic and state holiday calendar events. Holidays affect timesheet calculations and regular DTR computations.</p>
        </div>
        <div>
          <Button onClick={handleOpenAdd} className="gap-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl" id="btn-add-holiday">
            <Plus className="w-4 h-4" />
            Add Holiday
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Filters */}
        <Card className="md:col-span-3 border-neutral-200/80 shadow-sm rounded-2xl">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search holiday name or date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 rounded-xl border-neutral-200"
                id="holiday-search-input"
              />
            </div>
            
            <div className="w-full md:w-64">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="rounded-xl border-neutral-200" id="holiday-type-filter">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Holiday Types</SelectItem>
                  <SelectItem value="Regular">Regular Holiday</SelectItem>
                  <SelectItem value="Special Non-Working">Special Non-Working</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Holiday list Table */}
        <Card className="md:col-span-3 border-neutral-200/80 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-neutral-50/50 border-b border-neutral-100 p-6">
            <CardTitle className="text-base font-bold font-sans">Active Calendar Events ({filteredHolidays.length})</CardTitle>
            <CardDescription className="font-sans text-xs">Standard federal and custom school holidays configured on the system.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
                <p className="text-sm text-neutral-400 font-sans">Loading administrative calendar...</p>
              </div>
            ) : filteredHolidays.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Calendar className="w-12 h-12 text-neutral-300 stroke-[1.5] mb-2" />
                <p className="text-neutral-900 font-medium font-sans">No holidays found</p>
                <p className="text-xs text-neutral-400 font-sans mt-0.5">Try searching for an alternative term or add a new, custom holiday.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-neutral-100/50">
                    <TableRow>
                      <TableHead className="font-semibold text-neutral-800">Holiday</TableHead>
                      <TableHead className="font-semibold text-neutral-800">Date</TableHead>
                      <TableHead className="font-semibold text-neutral-800">Day of Week</TableHead>
                      <TableHead className="font-semibold text-neutral-800">Type</TableHead>
                      <TableHead className="text-right font-semibold text-neutral-800 pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHolidays.map((holiday) => {
                      let dayOfWeekLabel = '';
                      try {
                        if (holiday.date) {
                          dayOfWeekLabel = format(new Date(holiday.date), 'EEEE');
                        }
                      } catch (err) {}

                      return (
                        <TableRow key={holiday.id} className="hover:bg-neutral-50/30">
                          <TableCell className="font-medium text-neutral-900 py-3.5">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-neutral-400 shrink-0" />
                              <span className="font-semibold tracking-tight">{holiday.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-neutral-600 font-mono text-sm py-3.5">
                            {holiday.date ? format(new Date(holiday.date), 'MMMM d, yyyy') : '---'}
                          </TableCell>
                          <TableCell className="text-neutral-500 py-3.5">
                            {dayOfWeekLabel || '---'}
                          </TableCell>
                          <TableCell className="py-3.5">
                            <Badge 
                              variant="outline" 
                              className={
                                holiday.type === 'Regular'
                                  ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold'
                                  : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-50 rounded-lg text-xs font-semibold'
                              }
                            >
                              <Tag className="w-3 h-3 mr-1 shrink-0" />
                              {holiday.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right py-3.5 pr-6">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 w-8 p-0 rounded-xl border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                                onClick={() => handleOpenEdit(holiday)}
                                title="Edit Holiday"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 w-8 p-0 rounded-xl border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200"
                                onClick={() => handleOpenDelete(holiday)}
                                title="Delete Holiday"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Save Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <form onSubmit={handleFormSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold font-sans">
                {editingHoliday ? 'Edit public holiday' : 'Add custom public holiday'}
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500 font-sans">
                Configure calendar dates as public hold days. These days will automatically register across digital timesheets.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-6">
              <div className="space-y-1.5">
                <Label htmlFor="holiday-name" className="text-xs font-bold text-neutral-700">Holiday Name</Label>
                <Input
                  id="holiday-name"
                  placeholder="e.g. Christmas Day"
                  value={holidayForm.name}
                  onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                  className="rounded-xl border-neutral-200"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="holiday-date" className="text-xs font-bold text-neutral-700">Calendar Date</Label>
                <Input
                  id="holiday-date"
                  type="date"
                  value={holidayForm.date}
                  onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                  className="rounded-xl border-neutral-200"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="holiday-type" className="text-xs font-bold text-neutral-700 font-sans">Holiday Type</Label>
                <Select 
                  value={holidayForm.type} 
                  onValueChange={(val) => setHolidayForm({ ...holidayForm, type: val })}
                >
                  <SelectTrigger className="rounded-xl border-neutral-200 id-holiday-type-trigger">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Regular">Regular Holiday</SelectItem>
                    <SelectItem value="Special Non-Working">Special Non-Working_Holiday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2 md:gap-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)} 
                className="rounded-xl border-neutral-200 text-neutral-600 hover:bg-neutral-50"
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl bg-neutral-950 text-white hover:bg-neutral-900">
                {editingHoliday ? 'Save Changes' : 'Create Holiday'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-sans flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
              Remove Calendar Holiday
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500 font-sans">
              Are you sure you want to remove this holiday? This action is permanent and may affect historical payroll calculations if they aren't finalized.
            </DialogDescription>
          </DialogHeader>

          {holidayToDelete && (
            <div className="bg-red-50/50 rounded-xl p-4 border border-red-100 my-4">
              <p className="text-xs font-bold text-red-900 leading-none">{holidayToDelete.name}</p>
              <p className="text-[10px] text-red-600 mt-1 font-mono">{format(new Date(holidayToDelete.date), 'MMMM d, yyyy')}</p>
            </div>
          )}

          <DialogFooter className="gap-2 md:gap-0 mt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteOpen(false)} 
              className="rounded-xl border-neutral-200 text-neutral-500 hover:bg-neutral-100"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleDeleteConfirm} 
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HolidaysPage;
