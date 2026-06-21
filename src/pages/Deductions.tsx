import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../lib/api';
import { 
  Plus, 
  Search, 
  Trash2, 
  Filter,
  CreditCard,
  User,
  AlertCircle,
  Settings,
  Edit2,
  X,
  Upload,
  Check,
  AlertTriangle,
  Info,
  FileSpreadsheet
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from "../components/ui/badge";
import { formatCurrency } from '../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { DeleteConfirmationDialog } from '../components/DeleteConfirmationDialog';

const MATRIX_COLUMNS = [
  { id: 'policy', label: 'GSIS POLICY LOAN', typeName: 'Policy Loan' },
  { id: 'consol', label: 'GSIS CONSOL LOAN', typeName: 'Consol Loan' },
  { id: 'mplLite', label: 'GSIS MPL LITE', typeName: 'MPL Lite' },
  { id: 'mpl', label: 'GSIS MPL', typeName: 'Multipurpose Loan' },
  { id: 'cpl', label: 'GSIS CPL', typeName: 'Computer Purchase Loan' },
  { id: 'gfal', label: 'GSIS GFAL', typeName: 'GFAL' },
  { id: 'emergency', label: 'GSIS EMERGENCY LOAN', typeName: 'Emergency Loan' },
  { id: 'gsisPrem', label: 'GSIS PREM PERSONAL', typeName: 'GSIS Personal Premium' },
  { id: 'educAsst', label: 'GSIS EDUC ASST.', typeName: 'Educational Assistance' },
  { id: 'pagibigPersonal', label: 'PAG-IBIG PERSONAL(EE)', typeName: 'Pag-ibig Personal Contribution' },
  { id: 'pagibigMpl', label: 'PAG-IBIG MPL', typeName: 'Pag-ibig MPL' },
  { id: 'sss', label: 'SSS CONTRIBUTION', typeName: 'SSS Contribution/Loan' },
  { id: 'mp2', label: 'PAG-IBIG MP2', typeName: 'Pag-ibig MP2' },
  { id: 'philhealth', label: 'PHILHLTH CONT', typeName: 'PhilHealth Contribution' },
  { id: 'csb', label: 'CSB SAL. LOAN', typeName: 'CSB Loan' },
  { id: 'tax', label: 'TAX WITHHELD', typeName: 'Withholding Tax' },
];

const getEmployeeDeductionObj = (empDeds: any[], columnId: string) => {
  const mappings: { [key: string]: string[] } = {
    policy: ['policyloan', 'policy loan', 'gsis policy loan', 'policy_loan', 'dedpolicyloan'],
    consol: ['consoloan', 'consol loan', 'consolidation loan', 'conso loan', 'consolidation', 'dedconsoloan'],
    mplLite: ['mpllite', 'mpl_lite', 'mpl-lite', 'mpl_lite rlp', 'mplliterlp', 'mpl lite', 'multi-purpose loan lite', 'dedmpllite', 'mpl_lite_rlp'],
    mpl: ['mpl', 'multipurpose loan', 'multi purpose loan', 'multi-purpose loan', 'mpl loan', 'dedmpl', 'gsis multipurpose loan'],
    cpl: ['cpl', 'computer purchase loan', 'computer loan', 'cpl loan', 'dedcpl', 'gsis computer loan', 'cpl_loan'],
    gfal: ['gfal', 'gsis financial assistance loan', 'gsis financial assistance', 'gfal loan', 'dedgfal'],
    emergency: ['emrgyln', 'gsis emergency loan', 'emergency loan', 'emrgy ln', 'emrgy_ln', 'emergency_loan', 'dedemergencyloan'],
    gsisPrem: ['gsisprem', 'gsispersonal', 'gsisprempersonal', 'gsisEE', 'gsis personal', 'gsis contribution', 'gsis premium', 'gsis ee', 'dedgsisprempersonal', 'gsis prem personal', 'gsis personal share', 'gsis_prem', 'gsis personal premium'],
    educAsst: ['educasst', 'educ_asst', 'educational assistance', 'educational assistance loan', 'educ asst', 'dededucasst', 'gsis educational assistance'],
    pagibigPersonal: ['pagibigprem', 'pagibigpersonal', 'pagibigpersonalee', 'pagibigregular', 'pagibigee', 'hdmfpersonal', 'hdmfpersonalee', 'hdmfee', 'pagibig regular', 'pagibig personal', 'pagibig contribution', 'pagibig premium', 'pagibig ee', 'hdmf personal', 'hdmf contribution', 'hdmf ee', 'dedpagibigpersonal', 'pag-ibig personal', 'pag-ibig ee', 'pag-ibig regular', 'pagibig_prem', 'hdmf premium', 'pag-ibig personal(ee)'],
    pagibigMpl: ['pagibigmpl', 'pagibig_mpl', 'hdmf_mpl', 'pag-ibig mpl', 'dedpagibigmpl', 'hdmf mpl', 'pag-ibig mpl'],
    sss: ['sss', 'dedsss', 'sss contribution', 'sss premium', 'sss ee', 'sss_prem', 'sss share'],
    mp2: ['mp2', 'dedpagibigmp2', 'pagibig mp2', 'pag-ibig mp2', 'mp2 contribution', 'pagibig_mp2', 'hdmf mp2'],
    philhealth: ['philhealth', 'dedphilhealthcont', 'philhealth contribution', 'philhealth premium', 'philhealth ee', 'philhealth cont', 'philhealth_prem', 'ph_prem', 'phee', 'ph ee', 'philhealth ee share', 'philhealth cont.'],
    csb: ['csbloan', 'dedcsbloan', 'csb loan', 'csb', 'csbsalloan', 'csb sal loan'],
    tax: ['tax', 'dedtaxwithheld', 'withholding tax', 'tax withheld', 'wtax', 'income tax', 'withholding_tax', 'tax_withheld', 'wtax withheld', 'withholding tax(ee)', 'taxwithheld']
  };

  const colKeys = mappings[columnId] || [];
  const matched = empDeds.find(d => {
    const dT = String(d.type || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return colKeys.some(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === dT);
  });
  return matched || null;
};

const getEmployeeOtherDeductionsTotal = (empDeds: any[]) => {
  const mappings = [
    'policyloan', 'policy loan', 'gsis policy loan', 'policy_loan', 'dedpolicyloan',
    'consoloan', 'consol loan', 'consolidation loan', 'conso loan', 'consolidation', 'dedconsoloan',
    'mpllite', 'mpl_lite', 'mpl-lite', 'mpl_lite rlp', 'mplliterlp', 'mpl lite', 'multi-purpose loan lite', 'dedmpllite', 'mpl_lite_rlp',
    'mpl', 'multipurpose loan', 'multi purpose loan', 'multi-purpose loan', 'mpl loan', 'dedmpl', 'gsis multipurpose loan',
    'cpl', 'computer purchase loan', 'computer loan', 'cpl loan', 'dedcpl', 'gsis computer loan', 'cpl_loan',
    'gfal', 'gsis financial assistance loan', 'gsis financial assistance', 'gfal loan', 'dedgfal',
    'emrgyln', 'gsis emergency loan', 'emergency loan', 'emrgy ln', 'emrgy_ln', 'emergency_loan', 'dedemergencyloan',
    'gsisprem', 'gsispersonal', 'gsisprempersonal', 'gsisEE', 'gsis personal', 'gsis contribution', 'gsis premium', 'gsis ee', 'dedgsisprempersonal', 'gsis prem personal', 'gsis personal share', 'gsis_prem', 'gsis personal premium',
    'educasst', 'educ_asst', 'educational assistance', 'educational assistance loan', 'educ asst', 'dededucasst', 'gsis educational assistance',
    'pagibigprem', 'pagibigpersonal', 'pagibigpersonalee', 'pagibigregular', 'pagibigee', 'hdmfpersonal', 'hdmfpersonalee', 'hdmfee', 'pagibig regular', 'pagibig personal', 'pagibig contribution', 'pagibig premium', 'pagibig ee', 'hdmf personal', 'hdmf contribution', 'hdmf ee', 'dedpagibigpersonal', 'pag-ibig personal', 'pag-ibig ee', 'pag-ibig regular', 'pagibig_prem', 'hdmf premium', 'pag-ibig personal(ee)',
    'pagibigmpl', 'pagibig_mpl', 'hdmf_mpl', 'pag-ibig mpl', 'dedpagibigmpl', 'hdmf mpl', 'pag-ibig mpl',
    'sss', 'dedsss', 'sss contribution', 'sss premium', 'sss ee', 'sss_prem', 'sss share',
    'mp2', 'dedpagibigmp2', 'pagibig mp2', 'pag-ibig mp2', 'mp2 contribution', 'pagibig_mp2', 'hdmf mp2',
    'philhealth', 'dedphilhealthcont', 'philhealth contribution', 'philhealth premium', 'philhealth ee', 'philhealth cont', 'philhealth_prem', 'ph_prem', 'phee', 'ph ee', 'philhealth ee share', 'philhealth cont.',
    'csbloan', 'dedcsbloan', 'csb loan', 'csb', 'csbsalloan', 'csb sal loan',
    'tax', 'dedtaxwithheld', 'withholding tax', 'tax withheld', 'wtax', 'income tax', 'withholding_tax', 'tax_withheld', 'wtax withheld', 'withholding tax(ee)', 'taxwithheld'
  ];
  
  const unmapped = empDeds.filter(d => {
    const dT = String(d.type || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return !mappings.some(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === dT);
  });
  
  return unmapped.reduce((sum, d) => sum + Number(d.amount || 0), 0);
};

const Deductions = () => {
  const [deductions, setDeductions] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [deductionTypes, setDeductionTypes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);
  const [isManageTypesOpen, setIsManageTypesOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Import State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSearch, setImportSearch] = useState('');
  const [isDeductionDragging, setIsDeductionDragging] = useState(false);

  // Cell Edit Modal State
  const [isCellEditOpen, setIsCellEditOpen] = useState(false);
  const [cellEditData, setCellEditData] = useState<{
    employeeId: string;
    employeeName: string;
    columnId: string;
    colLabel: string;
    typeName: string;
    deductionId: string | null;
    amount: number;
    description: string;
  } | null>(null);

  // Form State for manual creation
  const [formData, setFormData] = useState({
    employeeId: '',
    type: '',
    description: '',
    amount: 0,
  });

  // Type form state
  const [typeFormData, setTypeFormData] = useState({
    name: '',
    description: ''
  });

  const [editingType, setEditingType] = useState<any>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'deduction' | 'type' | 'employee_deductions' | 'clear_all', employeeName?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dedData, empData, typeData] = await Promise.all([
        api.deductions.list(),
        api.employees.list(),
        api.deductions.listTypes()
      ]);
      setDeductions(dedData);
      setEmployees(empData);
      setDeductionTypes(typeData);
      
      if (typeData.length > 0 && !formData.type) {
        setFormData(prev => ({ ...prev, type: typeData[0].name }));
      }
    } catch (error: any) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.deductions.create({
        ...formData,
        amount: parseFloat(formData.amount as any)
      });
      toast.success('Deduction added successfully');
      setIsAddOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingType) {
        await api.deductions.updateType(editingType.id, typeFormData);
        toast.success('Deduction type updated successfully');
      } else {
        await api.deductions.createType(typeFormData);
        toast.success('Deduction type added successfully');
      }
      setIsAddTypeOpen(false);
      setEditingType(null);
      setTypeFormData({ name: '', description: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteType = async (id: string) => {
    setItemToDelete({ id, type: 'type' });
    setIsDeleteOpen(true);
  };

  const handleDeleteEmployeeDeductions = async (employeeId: string, employeeName: string) => {
    setItemToDelete({ id: employeeId, type: 'employee_deductions', employeeName });
    setIsDeleteOpen(true);
  };

  const handleClearAllDeductions = () => {
    setItemToDelete({ id: 'all', type: 'clear_all' });
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    setIsDeleting(true);
    try {
      if (itemToDelete.type === 'deduction') {
        await api.deductions.delete(itemToDelete.id);
        toast.success('Deduction removed');
      } else if (itemToDelete.type === 'employee_deductions') {
        await api.deductions.deleteByEmployee(itemToDelete.id);
        toast.success(`Cleared all active deductions for ${itemToDelete.employeeName}`);
      } else if (itemToDelete.type === 'clear_all') {
        await api.deductions.clearAll();
        toast.success('Cleared all employee active deductions successfully');
      } else {
        await api.deductions.deleteType(itemToDelete.id);
        toast.success('Deduction type removed');
      }
      setIsDeleteOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Error occurred during deletion');
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      type: deductionTypes.length > 0 ? deductionTypes[0].name : '',
      description: '',
      amount: 0,
    });
  };

  const processDeductionsExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        let workbook;
        try {
          workbook = XLSX.read(data, { type: 'array', cellDates: true });
        } catch (arrayErr) {
          try {
            const arr = new Uint8Array(data as ArrayBuffer);
            let binary = "";
            const len = arr.length;
            const chunkSize = 65536;
            for (let i = 0; i < len; i += chunkSize) {
              const chunk = arr.subarray(i, i + chunkSize);
              binary += String.fromCharCode.apply(null, chunk as any);
            }
            workbook = XLSX.read(binary, { type: 'binary', cellDates: true });
          } catch (binaryErr) {
            throw new Error("Unable to parse file structure. Ensure it is a valid Excel spreadsheet.");
          }
        }

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[];

        if (rawRows.length === 0) {
          toast.error("The selected sheet is empty");
          return;
        }

        // Search for header row
        let headerRowIndex = -1;
        const matchingColumns = [
          'bpno', 'bpnumber', 'employeeid', 'idnumber', 'employeename', 'fullname', 'lastname', 'firstname'
        ];
        
        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (Array.isArray(row)) {
            const hasHeaderIndicator = row.some(cell => {
              const str = String(cell || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
              return matchingColumns.includes(str) || [
                'consoloan', 'emergencyloan', 'gfal', 'mpl', 'cpl', 'policyloan', 'deductiontype', 'type', 'amount'
              ].includes(str);
            });
            if (hasHeaderIndicator) {
              headerRowIndex = i;
              break;
            }
          }
        }

        let headers: string[] = [];
        let dataRows: any[] = [];
        if (headerRowIndex !== -1) {
          headers = rawRows[headerRowIndex].map(h => String(h || '').trim());
          dataRows = rawRows.slice(headerRowIndex + 1);
        } else {
          headers = rawRows[0] ? rawRows[0].map(h => String(h || '').trim()) : [];
          dataRows = rawRows.slice(1);
        }

        // Helper to retrieve cell values
        const getValFromRow = (row: any[], keys: string[]) => {
          for (const key of keys) {
            const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            const colIdx = headers.findIndex(h => typeof h === 'string' && h.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanKey);
            if (colIdx !== -1 && row[colIdx] !== undefined && row[colIdx] !== null) {
              return row[colIdx];
            }
          }
          return null;
        };

        const parsedEntries: any[] = [];

        // Determine if it is a single-row "flat list" with Type & Amount columns
        const typeColIdx = headers.findIndex(h => typeof h === 'string' && ['type', 'deductiontype', 'dedtype', 'ded_type', 'type of deduction'].includes(h.toLowerCase()));
        const amountColIdx = headers.findIndex(h => typeof h === 'string' && ['amount', 'value', 'dedamount', 'ded_amount'].includes(h.toLowerCase()));

        const isSimpleFlatList = typeColIdx !== -1 && amountColIdx !== -1;

        // Define deduction columns for cross-tab multi-column sheet style
        const deductionMappings = [
          { type: 'Policy Loan', keys: ['policyloan', 'policy loan', 'gsis policy loan', 'policy_loan', 'dedpolicyloan'] },
          { type: 'Consol Loan', keys: ['consoloan', 'consol loan', 'consolidation loan', 'conso loan', 'consolidation', 'dedconsoloan'] },
          { type: 'MPL Lite', keys: ['mpllite', 'mpl_lite', 'mpl-lite', 'mpl_lite rlp', 'mplliterlp', 'mpl lite', 'multi-purpose loan lite', 'dedmpllite', 'mpl_lite_rlp'] },
          { type: 'Multipurpose Loan', keys: ['mpl', 'multipurpose loan', 'multi purpose loan', 'multi-purpose loan', 'mpl loan', 'dedmpl', 'gsis multipurpose loan'] },
          { type: 'Computer Purchase Loan', keys: ['cpl', 'computer purchase loan', 'computer loan', 'cpl loan', 'dedcpl', 'gsis computer loan', 'cpl_loan'] },
          { type: 'GFAL', keys: ['gfal', 'gsis financial assistance loan', 'gsis financial assistance', 'gfal loan', 'dedgfal'] },
          { type: 'Emergency Loan', keys: ['emrgyln', 'gsis emergency loan', 'emergency loan', 'emrgy ln', 'emrgy_ln', 'emergency_loan', 'dedemergencyloan'] },
          { type: 'GSIS Personal Premium', keys: ['gsisprem', 'gsispersonal', 'gsisprempersonal', 'gsisEE', 'gsis personal', 'gsis contribution', 'gsis premium', 'gsis ee', 'dedgsisprempersonal', 'gsis prem personal', 'gsis personal share', 'gsis_prem', 'gsis personal premium'] },
          { type: 'Educational Assistance', keys: ['educasst', 'educ_asst', 'educational assistance', 'educational assistance loan', 'educ asst', 'dededucasst', 'gsis educational assistance'] },
          { type: 'Pag-ibig Personal Contribution', keys: ['pagibigprem', 'pagibigpersonal', 'pagibigpersonalee', 'pagibigregular', 'pagibigee', 'hdmfpersonal', 'hdmfpersonalee', 'hdmfee', 'pagibig regular', 'pagibig personal', 'pagibig contribution', 'pagibig premium', 'pagibig ee', 'hdmf personal', 'hdmf contribution', 'hdmf ee', 'dedpagibigpersonal', 'pag-ibig personal', 'pag-ibig ee', 'pag-ibig regular', 'pagibig_prem', 'hdmf premium', 'pag-ibig personal(ee)'] },
          { type: 'Pag-ibig MPL', keys: ['pagibigmpl', 'pagibig_mpl', 'hdmf_mpl', 'pag-ibig mpl', 'dedpagibigmpl', 'hdmf mpl', 'pag-ibig mpl'] },
          { type: 'SSS Contribution/Loan', keys: ['sss', 'dedsss', 'sss contribution', 'sss premium', 'sss ee', 'sss_prem', 'sss share'] },
          { type: 'Pag-ibig MP2', keys: ['mp2', 'dedpagibigmp2', 'pagibig mp2', 'pag-ibig mp2', 'mp2 contribution', 'pagibig_mp2', 'hdmf mp2'] },
          { type: 'PhilHealth Contribution', keys: ['philhealth', 'dedphilhealthcont', 'philhealth contribution', 'philhealth premium', 'philhealth ee', 'philhealth cont', 'philhealth_prem', 'ph_prem', 'phee', 'ph ee', 'philhealth ee share', 'philhealth cont.'] },
          { type: 'CSB Loan', keys: ['csbloan', 'dedcsbloan', 'csb loan', 'csb', 'csbsalloan', 'csb sal loan'] },
          { type: 'Withholding Tax', keys: ['tax', 'dedtaxwithheld', 'withholding tax', 'tax withheld', 'wtax', 'income tax', 'withholding_tax', 'tax_withheld', 'wtax withheld', 'withholding tax(ee)', 'taxwithheld'] },
        ];

        for (const row of dataRows) {
          if (!Array.isArray(row) || row.length === 0) continue;

          // 1. Employee lookup details
          const bpnoVal = String(getValFromRow(row, [
            'bpno', 'bpNo', 'bp number', 'bp_number', 'employeeid', 'id', 'idnumber', 'employee id', 'id no', 'id_number'
          ]) || '').trim();

          const exLast = String(getValFromRow(row, ['lastname', 'last name', 'familyname', 'surname']) || '').trim();
          const exFirst = String(getValFromRow(row, ['firstname', 'first name', 'givenname']) || '').trim();
          const exFull = String(getValFromRow(row, ['employeename', 'employee name', 'fullname', 'full name', 'name']) || '').trim();

          if (!bpnoVal && !exLast && !exFirst && !exFull) continue;

          // Find matching employee
          let matchedEmp = employees.find(emp => {
            if (bpnoVal && String(emp.employeeId || emp.bpno || '').trim() === bpnoVal) return true;
            return false;
          });

          if (!matchedEmp) {
            matchedEmp = employees.find(emp => {
              const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
              const empLast = norm(emp.lastName);
              const empFirst = norm(emp.firstName);
              if (exLast && exFirst) {
                if (norm(exLast) === empLast && norm(exFirst) === empFirst) return true;
              }
              const excelFullNorm = norm(exFull);
              const empFullNorm = norm(`${emp.lastName}${emp.firstName}`);
              if (excelFullNorm && excelFullNorm === empFullNorm) return true;
              return false;
            });
          }

          const descriptionVal = String(getValFromRow(row, ['description', 'remarks', 'memo', 'desc']) || '').trim();

          if (isSimpleFlatList) {
            const rawType = String(getValFromRow(row, ['type', 'deductiontype', 'dedtype']) || '').trim();
            const rawAmount = parseFloat(String(getValFromRow(row, ['amount', 'value', 'dedamount']) || '0')) || 0;
            if (rawType && rawAmount > 0) {
              parsedEntries.push({
                employeeId: matchedEmp ? matchedEmp.id : null,
                employeeName: matchedEmp ? `${matchedEmp.lastName}, ${matchedEmp.firstName}` : (exFull || `${exLast}, ${exFirst}` || bpnoVal || 'Unknown Employee'),
                bpno: bpnoVal || (matchedEmp ? matchedEmp.employeeId : ''),
                type: rawType,
                description: descriptionVal || `Imported ${rawType}`,
                amount: rawAmount,
                isMatched: !!matchedEmp
              });
            }
          } else {
            // Check each standard deduction column
            for (const mapItem of deductionMappings) {
              const val = parseFloat(String(getValFromRow(row, mapItem.keys) || '0')) || 0;
              if (val > 0) {
                parsedEntries.push({
                  employeeId: matchedEmp ? matchedEmp.id : null,
                  employeeName: matchedEmp ? `${matchedEmp.lastName}, ${matchedEmp.firstName}` : (exFull || `${exLast}, ${exFirst}` || bpnoVal || 'Unknown Employee'),
                  bpno: bpnoVal || (matchedEmp ? matchedEmp.employeeId : ''),
                  type: mapItem.type,
                  description: descriptionVal || `Imported ${mapItem.type}`,
                  amount: val,
                  isMatched: !!matchedEmp
                });
              }
            }
          }
        }

        setImportPreview(parsedEntries);
        setIsImportOpen(true);
      } catch (err: any) {
        toast.error("Failed to parse file: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processDeductionsExcel(files[0]);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    setIsImporting(true);
    try {
      const itemsToImport = importPreview.filter(item => item.isMatched && item.employeeId);
      if (itemsToImport.length === 0) {
        toast.error("No valid, matched employee records to import.");
        setIsImporting(false);
        return;
      }

      await api.deductions.importBulk(itemsToImport);
      toast.success(`Successfully imported ${itemsToImport.length} deductions!`);
      setIsImportOpen(false);
      setImportPreview([]);
      fetchData();
    } catch (err: any) {
      toast.error("Failed to import: " + (err.message || err));
    } finally {
      setIsImporting(false);
    }
  };

  const handleCellClick = (employee: any, column: any) => {
    const empDeds = deductions.filter(d => d.employeeId === employee.id);
    const existingObj = getEmployeeDeductionObj(empDeds, column.id);

    setCellEditData({
      employeeId: employee.id,
      employeeName: `${employee.lastName}, ${employee.firstName}`,
      columnId: column.id,
      colLabel: column.label,
      typeName: column.typeName,
      deductionId: existingObj ? existingObj.id : null,
      amount: existingObj ? existingObj.amount : 0,
      description: existingObj ? existingObj.description : `Monthly ${column.typeName}`
    });
    setIsCellEditOpen(true);
  };

  const handleCellSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cellEditData) return;

    try {
      if (cellEditData.deductionId) {
        // Update deduction
        await api.deductions.update(cellEditData.deductionId, {
          employeeId: cellEditData.employeeId,
          type: cellEditData.typeName,
          description: cellEditData.description,
          amount: parseFloat(cellEditData.amount as any)
        });
        toast.success(`Updated ${cellEditData.colLabel} for ${cellEditData.employeeName}`);
      } else {
        // Create deduction
        // Ensure deduction type exists in DB
        const typeExists = deductionTypes.some(t => String(t.name).toLowerCase() === cellEditData.typeName.toLowerCase());
        if (!typeExists) {
          try {
            await api.deductions.createType({ name: cellEditData.typeName, description: `${cellEditData.colLabel} (Auto-created)` });
          } catch (err) {
            // Safe to ignore or already exists
          }
        }

        await api.deductions.create({
          employeeId: cellEditData.employeeId,
          type: cellEditData.typeName,
          description: cellEditData.description,
          amount: parseFloat(cellEditData.amount as any)
        });
        toast.success(`Added ${cellEditData.colLabel} for ${cellEditData.employeeName}`);
      }
      setIsCellEditOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update deduction');
    }
  };

  const handleCellDelete = async () => {
    if (!cellEditData || !cellEditData.deductionId) return;
    try {
      await api.deductions.delete(cellEditData.deductionId);
      toast.success(`Removed ${cellEditData.colLabel} for ${cellEditData.employeeName}`);
      setIsCellEditOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete deduction');
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.lastName}, ${emp.firstName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
      String(emp.employeeId || emp.bpno || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = filterCategory === 'all' || emp.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const uniqueCategories = Array.from(new Set(employees.map(e => e.category).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      {/* Top Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900">Deductions</h2>
          <p className="text-neutral-500">Interactive matrix for active loans, insurance, and other payroll subtractions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Clear All Deductions */}
          <Button 
            variant="outline" 
            className="border-red-200 hover:border-red-500 text-red-600 hover:text-red-700 bg-red-50/50 hover:bg-red-50 gap-2 font-medium"
            onClick={handleClearAllDeductions}
          >
            <Trash2 className="w-4 h-4" />
            Clear All Deductions
          </Button>

          {/* Manage Types */}
          <Dialog open={isManageTypesOpen} onOpenChange={setIsManageTypesOpen}>
            <DialogTrigger render={(props) => (
              <Button {...props} variant="outline" className="border-neutral-300 hover:border-neutral-500 gap-2">
                <Settings className="w-4 h-4" />
                Manage Types
              </Button>
            )} />
            <DialogContent className="max-w-md bg-white">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Manage Deduction Types</DialogTitle>
                <DialogDescription>
                  Edit or remove existing deduction categories.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="divide-y divide-neutral-100 border rounded-lg overflow-auto max-h-[300px] custom-scrollbar">
                  {deductionTypes.map(type => (
                    <div key={type.id} className="p-3 flex items-center justify-between bg-white hover:bg-neutral-50 transition-colors">
                      <div>
                        <div className="font-semibold text-sm text-neutral-800">{type.name}</div>
                        <div className="text-xs text-neutral-500">{type.description || 'No description'}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-neutral-400 hover:text-neutral-900"
                          onClick={() => {
                            setEditingType(type);
                            setTypeFormData({ name: type.name, description: type.description || '' });
                            setIsAddTypeOpen(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-neutral-400 hover:text-red-600"
                          onClick={() => handleDeleteType(type.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {deductionTypes.length === 0 && (
                    <div className="p-4 text-center text-sm text-neutral-500">No types defined.</div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  className="w-full gap-2 border-dashed"
                  onClick={() => {
                    setEditingType(null);
                    setTypeFormData({ name: '', description: '' });
                    setIsAddTypeOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Add New Type
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Type Form dialog (inside manage types) */}
          <Dialog open={isAddTypeOpen} onOpenChange={(open) => {
            setIsAddTypeOpen(open);
            if (!open) {
              setEditingType(null);
              setTypeFormData({ name: '', description: '' });
            }
          }}>
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle className="font-bold">{editingType ? 'Edit' : 'Add'} Deduction Type</DialogTitle>
                <DialogDescription>
                  Create a new category for payroll deductions.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleTypeSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="typeName">Type Name</Label>
                  <Input 
                    id="typeName" 
                    placeholder="e.g. Health Insurance" 
                    value={typeFormData.name}
                    onChange={e => setTypeFormData({...typeFormData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="typeDesc">Description</Label>
                  <Input 
                    id="typeDesc" 
                    placeholder="Brief description of this deduction" 
                    value={typeFormData.description}
                    onChange={e => setTypeFormData({...typeFormData, description: e.target.value})}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full bg-neutral-900 text-white hover:bg-neutral-800">
                    {editingType ? 'Update Type' : 'Save Type'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Manual Add Deduction */}
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger render={(props) => (
              <Button {...props} className="bg-neutral-900 text-white hover:bg-neutral-800 gap-2">
                <Plus className="w-4 h-4" />
                Add Deduction
              </Button>
            )} />
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle className="font-bold">Add New Deduction</DialogTitle>
                <DialogDescription>
                  Apply a custom deduction amount to an employee's profile.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="employee">Select Employee</Label>
                  <Select 
                    value={formData.employeeId} 
                    onValueChange={v => setFormData({...formData, employeeId: v})}
                  >
                    <SelectTrigger className="bg-white border-neutral-300">
                      <SelectValue placeholder="Choose an employee" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.lastName}, {emp.firstName} ({emp.employeeId || emp.bpno || 'No ID'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Deduction Type</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={v => setFormData({...formData, type: v})}
                    >
                      <SelectTrigger className="bg-white border-neutral-300">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {deductionTypes.map(type => (
                          <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (PHP)</Label>
                    <Input 
                      id="amount" 
                      type="number" 
                      step="0.01"
                      placeholder="0.00" 
                      value={isNaN(formData.amount) || formData.amount === 0 ? '' : formData.amount}
                      onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description / Remarks</Label>
                  <Input 
                    id="description" 
                    placeholder="e.g. GSIS Loan Payment 1 of 12" 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full bg-neutral-900 text-white hover:bg-neutral-800">Apply Deduction</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Complete Deductions Summary & Import Tool Card */}
      <Card className="border border-neutral-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-3 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-1.5 font-sans text-neutral-800">
              <FileSpreadsheet className="w-5 h-5 text-neutral-800" />
              Deductions Summary & Import Tool
            </CardTitle>
            <CardDescription className="text-xs text-neutral-500">
              Review automated totals and hot-import deductions directly from batch Excel spreadsheets.
            </CardDescription>
          </div>
          <div className="text-[10px] font-bold px-2.5 py-1 rounded uppercase font-mono bg-neutral-100 border border-neutral-200 text-neutral-700">
            Active Master Rules
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5 font-sans">Active Deductions Summary</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                  {Object.entries(
                    deductions.reduce((acc: any, item: any) => {
                      const name = item.type;
                      acc[name] = (acc[name] || 0) + Number(item.amount || 0);
                      return acc;
                    }, {})
                  ).map(([name, total]: [string, any]) => (
                    <div key={name} className="p-2.5 bg-neutral-50/70 rounded-lg border border-neutral-100 flex flex-col justify-between">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{name}</p>
                      <p className="text-xs font-bold text-red-650">₱{formatCurrency(total)}</p>
                    </div>
                  ))}
                  {Object.keys(deductions.reduce((acc: any, item: any) => {
                    const name = item.type;
                    acc[name] = (acc[name] || 0) + Number(item.amount || 0);
                    return acc;
                  }, {})).length === 0 && (
                    <div className="col-span-full py-8 text-center text-xs text-neutral-400 italic font-sans animate-pulse">
                      No active deductions have been defined yet. Drag/select an Excel spreadsheet on the right to import!
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 text-[10px] text-zinc-500 font-sans">
                * The above values are live totals from all active recurring rules in the deduction matrix below.
              </div>
            </div>
            
            {/* Fully Functional Upload Card Slot */}
            <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-neutral-100 pt-4 lg:pt-0 lg:pl-5 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5 font-sans">Spreadsheet Import (.xls, .xlsx)</h4>
                
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDeductionDragging(true);
                  }}
                  onDragLeave={() => setIsDeductionDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDeductionDragging(false);
                    const files = e.dataTransfer.files;
                    if (files && files.length > 0) {
                      const file = files[0];
                      if (file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx')) {
                        processDeductionsExcel(file);
                      } else {
                        toast.error("Invalid file format. Please upload .xls or .xlsx spreadsheet file.");
                      }
                    }
                  }}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] ${
                    isDeductionDragging 
                      ? "border-emerald-500 bg-emerald-50/40 scale-[0.99] shadow-inner" 
                      : "border-neutral-200 hover:border-zinc-400 bg-zinc-50/50 hover:bg-zinc-50"
                  }`}
                  onClick={() => document.getElementById('card-deductions-file-input')?.click()}
                >
                  <Upload className={`w-8 h-8 mb-2 transition-all ${isDeductionDragging ? "text-emerald-600 scale-110 animate-bounce" : "text-neutral-400"}`} />
                  <p className="text-xs font-semibold text-neutral-800 font-sans">
                    {isDeductionDragging ? "Drop the sheet now!" : "Drag & drop sheet here"}
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-1 font-sans">
                    or <span className="text-emerald-600 hover:underline font-bold">browse local files</span>
                  </p>
                  <input
                    id="card-deductions-file-input"
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>
              <div className="mt-3 text-[10px] text-zinc-500 leading-relaxed font-sans">
                💡 Matches Excel rows with system employee records using full names or GSIS BP numbers automatically first.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Info Cards (Compact Horizontal Row) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider font-sans">Total Deductions Active</div>
            <div className="text-xl font-bold text-neutral-900">₱{formatCurrency(deductions.reduce((acc, curr) => acc + Number(curr.amount || 0), 0))}</div>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-neutral-50 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-neutral-600" />
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider font-sans">Affected Staff</div>
            <div className="text-xl font-bold text-neutral-900">{new Set(deductions.map(d => d.employeeId)).size} / {employees.length}</div>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider font-sans">Available Types</div>
            <div className="text-xl font-bold text-neutral-900">{deductionTypes.length} Classes</div>
          </div>
        </div>

        <div className="bg-[#fcf8f2] border border-amber-100 rounded-xl p-3 flex gap-3 shadow-none md:col-span-1">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 leading-normal font-sans">
            <strong>Spreadsheet Mode:</strong> Click any cell in the table to add, modify, or delete that specific deduction for the employee.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 border border-neutral-200 bg-white rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input 
            placeholder="Search by employee name or BPNO/ID..." 
            className="pl-10 bg-white border-neutral-300"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-neutral-400 shrink-0" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px] bg-white border-neutral-300">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">All Employment Categories</SelectItem>
              {uniqueCategories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-neutral-500 text-xs px-2"
            onClick={() => {
              setSearchTerm('');
              setFilterCategory('all');
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Complete Horizontal Matrix Table */}
      <div className="border border-neutral-200 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="overflow-auto custom-scrollbar max-h-[600px] w-full" style={{ maxWidth: '100%' }}>
          <table className="w-full border-collapse border-spacing-0 text-[11.5px]">
            <thead className="sticky top-0 bg-white z-40">
              {/* Header Row 1: Navy category and Spanning "DEDUCTIONS" Banner */}
              <tr className="border-b-0 hover:bg-transparent">
                <th 
                  rowSpan={2} 
                  className="sticky left-0 top-0 z-50 bg-[#12284c] text-white font-bold text-xs uppercase tracking-wider text-center align-middle border-r border-[#1a3a6b]"
                  style={{ minWidth: '60px', width: '60px', height: '64px' }}
                >
                  Serial No.
                </th>
                <th 
                  rowSpan={2} 
                  className="sticky left-[60px] top-0 z-50 bg-[#12284c] text-white font-bold text-xs uppercase tracking-wider text-left align-middle border-r border-[#1a3a6b]"
                  style={{ minWidth: '220px', width: '220px' }}
                >
                  Name
                </th>
                <th 
                  colSpan={MATRIX_COLUMNS.length + 1} 
                  className="sticky top-0 z-30 bg-rose-50 border-b border-rose-100 text-rose-800 text-center font-extrabold text-xs tracking-[0.25em] uppercase py-2 leading-none"
                  style={{ height: '34px' }}
                >
                  DEDUCTIONS
                </th>
              </tr>

              {/* Header Row 2: Sub-headers for specific deductions */}
              <tr className="border-b border-neutral-200 hover:bg-transparent">
                {MATRIX_COLUMNS.map((col) => (
                  <th 
                    key={col.id} 
                    className="sticky top-[34px] z-30 bg-rose-50/90 text-[#71161d] font-extrabold text-[10px] text-center leading-normal uppercase px-2 py-3 border-r border-rose-100/60"
                    style={{ minWidth: '130px', width: '140px', height: '34px' }}
                  >
                    {col.label}
                  </th>
                ))}
                <th 
                  className="sticky top-[34px] z-30 bg-rose-50/90 text-[#71161d] font-extrabold text-[10px] text-center leading-normal uppercase px-2 py-3"
                  style={{ minWidth: '120px', width: '130px' }}
                >
                  OTHER DEDS
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={MATRIX_COLUMNS.length + 3} className="text-center py-12 text-neutral-500">
                    Loading spreadsheet deductions...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={MATRIX_COLUMNS.length + 3} className="text-center py-12 text-neutral-500">
                    No matching employee records.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, idx) => {
                  const empDeds = deductions.filter(d => d.employeeId === emp.id);

                  return (
                    <tr key={emp.id} className="hover:bg-neutral-50/60 transition-colors border-b border-neutral-100 group">
                      {/* Serial Number */}
                      <td 
                        className="sticky left-0 z-20 font-mono text-xs text-center font-bold text-neutral-500 border-r border-[#1a3a6b]/20 bg-[#f9fafb] group-hover:bg-[#f3f4f6]"
                        style={{ minWidth: '60px', width: '60px' }}
                      >
                        {idx + 1}
                      </td>

                      {/* Name Row with Trash icon hovered */}
                      <td 
                        className="sticky left-[60px] z-20 font-medium text-xs border-r border-[#1a3a6b]/20 relative pr-10 bg-white group-hover:bg-[#f9fafb]"
                        style={{ minWidth: '220px', width: '220px' }}
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-neutral-800 uppercase leading-snug truncate block max-w-[140px]" title={`${emp.lastName}, ${emp.firstName}`}>
                            {emp.lastName}, {emp.firstName}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-sans tracking-wide truncate block max-w-[145px]" title={emp.category}>
                            {emp.category} • {emp.employeeId || emp.bpno || 'No ID'}
                          </span>
                        </div>
                        
                        {/* Always accessible / visible on hover action to clear deductions */}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteEmployeeDeductions(emp.id, `${emp.lastName}, ${emp.firstName}`)}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 bg-transparent hover:bg-red-50 text-neutral-400 hover:text-red-600 rounded-md transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                          title="Clear all deductions for this employee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>

                      {/* Standard Columns Cells */}
                      {MATRIX_COLUMNS.map((col) => {
                        const dedObj = getEmployeeDeductionObj(empDeds, col.id);
                        const numVal = dedObj ? Number(dedObj.amount || 0) : 0;

                        return (
                          <td 
                            key={col.id} 
                            onClick={() => handleCellClick(emp, col)}
                            className={`text-right text-xs font-mono border-r border-neutral-100/60 cursor-pointer transition-all hover:bg-amber-50/50 hover:shadow-inner px-3 py-4 select-none ${
                              numVal > 0 
                                ? 'font-bold text-neutral-900 bg-[#fef2f2]/60' 
                                : 'text-neutral-300 font-normal hover:text-neutral-500'
                            }`}
                          >
                            ₱{formatCurrency(numVal)}
                          </td>
                        );
                      })}

                      {/* OTHER DEDUCTIONS Column */}
                      {(() => {
                        const otherVal = getEmployeeOtherDeductionsTotal(empDeds);
                        return (
                          <td 
                            className={`text-right text-xs font-mono px-3 py-4 select-none ${
                              otherVal > 0 ? 'font-bold text-neutral-900 bg-[#fef2f2]/60' : 'text-neutral-300 font-normal'
                            }`}
                          >
                            ₱{formatCurrency(otherVal)}
                          </td>
                        );
                      })()}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal for types and employees */}
      <DeleteConfirmationDialog 
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title={
          itemToDelete?.type === 'employee_deductions' 
            ? "Clear All Employee Deductions" 
            : itemToDelete?.type === 'clear_all'
            ? "Clear All System Deductions"
            : itemToDelete?.type === 'deduction' 
            ? "Delete Deduction" 
            : "Delete Deduction Type"
        }
        description={
          itemToDelete?.type === 'employee_deductions'
            ? `Are you sure you want to clear ALL deductions for ${itemToDelete.employeeName}? This will set all columns to ₱0.00 in the payroll rules.`
            : itemToDelete?.type === 'clear_all'
            ? "Are you sure you want to clear ALL deductions for ALL employees in the system? This action is irreversible and will reset the entire deductions matrix to ₱0.00."
            : itemToDelete?.type === 'deduction'
            ? "Are you sure you want to delete this specific deduction?"
            : "Are you sure you want to delete this deduction type? This will affect Excel importing rules."
        }
      />

      {/* Cell Quick Edit / Add Popover Dialog */}
      <Dialog open={isCellEditOpen} onOpenChange={setIsCellEditOpen}>
        <DialogContent className="max-w-sm bg-white p-6 rounded-xl border border-neutral-200">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              {cellEditData?.deductionId ? "Edit Deduction" : "Add Deduction"}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              For <strong className="text-neutral-700">{cellEditData?.employeeName}</strong> under <span className="text-rose-900 font-semibold">{cellEditData?.colLabel}</span>.
            </DialogDescription>
          </DialogHeader>

          {cellEditData && (
            <form onSubmit={handleCellSave} className="space-y-4 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="cellAmount" className="text-xs font-semibold text-neutral-700">Amount (₱)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400 font-mono">₱</span>
                  <Input 
                    id="cellAmount"
                    type="number" 
                    step="0.01"
                    placeholder="0.00" 
                    className="pl-7 font-mono text-sm border-neutral-300"
                    value={cellEditData.amount === 0 ? '' : cellEditData.amount}
                    onChange={e => setCellEditData({...cellEditData, amount: parseFloat(e.target.value) || 0})}
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cellDesc" className="text-xs font-semibold text-neutral-700">Description / Memo</Label>
                <Input 
                  id="cellDesc"
                  placeholder="Monthly deduction description"
                  className="text-xs border-neutral-300"
                  value={cellEditData.description}
                  onChange={e => setCellEditData({...cellEditData, description: e.target.value})}
                />
              </div>

              <div className="flex gap-2 pt-2">
                {cellEditData.deductionId && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={handleCellDelete}
                    className="flex-1 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 hover:text-red-700 text-xs h-9"
                  >
                    <Trash2 className="w-4 h-4 mr-1 shrink-0" />
                    Delete
                  </Button>
                )}
                <Button 
                  type="submit" 
                  className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white text-xs h-9"
                >
                  {cellEditData.deductionId ? "Save Changes" : "Apply Deduction"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Preview Modal (For Excel Parsing) */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white rounded-xl border border-neutral-200">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle className="text-xl font-bold text-neutral-900 flex items-center gap-2">
              Import Deductions Preview
            </DialogTitle>
            <DialogDescription>
              Review the parsed deductions. Only matched employee records will be successfully imported as active deductions. A total of {importPreview.length} records found.
            </DialogDescription>
          </DialogHeader>

          {/* Search Table */}
          <div className="px-6 py-2 flex items-center justify-between gap-4 shrink-0">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search by parsed participant name..."
                value={importSearch}
                onChange={e => setImportSearch(e.target.value)}
                className="pl-10 h-9 text-xs"
              />
            </div>
            <div className="text-xs font-semibold text-neutral-600 font-sans">
              Matched: <span className="text-green-600">{importPreview.filter(r => r.isMatched).length}</span> / {importPreview.length} records
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-4 custom-scrollbar">
            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-neutral-50 sticky top-0">
                  <TableRow>
                    <TableHead className="font-bold text-xs bg-neutral-50">BPNO / ID</TableHead>
                    <TableHead className="font-bold text-xs bg-neutral-50">Employee Name</TableHead>
                    <TableHead className="font-bold text-xs bg-neutral-50">Category</TableHead>
                    <TableHead className="font-bold text-xs text-right bg-neutral-50">Amount (₱)</TableHead>
                    <TableHead className="font-bold text-xs text-center bg-neutral-50">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importPreview
                    .filter(row => row.employeeName.toLowerCase().includes(importSearch.toLowerCase()) || row.type.toLowerCase().includes(importSearch.toLowerCase()))
                    .map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs font-medium">{row.bpno || 'N/A'}</TableCell>
                        <TableCell className="text-xs">
                          <div className="font-semibold text-neutral-800">{row.employeeName}</div>
                          <div className="text-[10px] text-neutral-500">{row.description}</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px] font-medium bg-neutral-50 text-neutral-600 uppercase font-mono">{row.type}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold text-red-600">
                          -₱{formatCurrency(row.amount)}
                        </TableCell>
                        <TableCell className="text-xs text-center">
                          {row.isMatched ? (
                            <Badge className="bg-green-100 hover:bg-green-200 text-green-800 text-[10px] uppercase font-bold border-transparent">
                              Matched
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 hover:bg-red-200 text-red-800 text-[10px] uppercase font-bold border-transparent flex items-center gap-1 justify-center max-w-[90px] mx-auto">
                              <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                              Unresolved
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  {importPreview.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center p-8 text-neutral-500">
                        No records parsed from spreadsheet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="p-6 pt-2 border-t border-neutral-100 bg-neutral-50 shrink-0 flex items-center justify-between">
            <div className="text-xs text-neutral-500">
              Total deductions to import: <span className="font-bold text-red-600">₱{formatCurrency(importPreview.filter(r => r.isMatched).reduce((acc, c) => acc + Number(c.amount || 0), 0))}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setIsImportOpen(false); setImportPreview([]); }} disabled={isImporting} className="h-9">
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleConfirmImport} 
                disabled={isImporting || importPreview.filter(r => r.isMatched).length === 0}
                className="h-9 bg-neutral-900 hover:bg-neutral-800 text-white gap-2"
              >
                {isImporting ? "Importing..." : `Import Selected (${importPreview.filter(r => r.isMatched).length})`}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Deductions;
