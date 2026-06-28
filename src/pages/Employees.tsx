import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import * as XLSX from 'xlsx';
import XLSXStyle from 'xlsx-js-style';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  UserPlus,
  Filter,
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
  History,
  FileText,
  CreditCard,
  User,
  Mail,
  Briefcase,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from "../components/ui/badge";
import { formatCurrency, cn } from '../lib/utils';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { toast } from 'sonner';
import { DeleteConfirmationDialog } from '../components/DeleteConfirmationDialog';

const formatTimeTo12Hour = (timeStr: string): string => {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  if (trimmed.toLowerCase().includes('am') || trimmed.toLowerCase().includes('pm')) {
    return trimmed;
  }
  const parts = trimmed.split(':');
  if (parts.length < 2) return trimmed;
  let hour = parseInt(parts[0], 10);
  const min = parts[1];
  if (isNaN(hour)) return trimmed;
  
  let ampm = 'AM';
  if (hour >= 12) {
    ampm = 'PM';
  } else if (hour > 0 && hour <= 6) {
    ampm = 'PM';
  } else {
    ampm = 'AM';
  }
  
  let displayHour = hour % 12;
  if (displayHour === 0) displayHour = 12;
  const hourFormatted = String(displayHour).padStart(2, '0');
  return `${hourFormatted}:${min} ${ampm}`;
};

const Employees = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [payrollHistory, setPayrollHistory] = useState<any[]>([]);
  const [deductionHistory, setDeductionHistory] = useState<any[]>([]);
  const [employeeSchedules, setEmployeeSchedules] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const [positions, setPositions] = useState<any[]>([]);
  const [isManagePositionsOpen, setIsManagePositionsOpen] = useState(false);
  const [isAddPositionOpen, setIsAddPositionOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<any>(null);
  const [positionFormData, setPositionFormData] = useState({
    name: '',
    description: ''
  });

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSalaryType, setFilterSalaryType] = useState('all');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'employee' | 'category' | 'position' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Excel Import State
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState<any[]>([]);
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    category: '',
    basicSalary: 0,
    salaryType: 'monthly',
    status: 'active',
    phoneNumber: '',
    hasSss: false,
    hasPhilhealth: false,
    hasPagibig: false,
    bpno: '',
    mi: '',
    prefix: '',
    appellation: '',
    birthDate: '',
    crn: '',
    effectivityDate: '',
    position: '',
    gender: 'MALE',
    profileImage: '',
    employeeNo: ''
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [empData, catData, posData] = await Promise.all([
        api.employees.list(),
        api.employees.listCategories(),
        api.employees.listPositions()
      ]);
      setEmployees(empData);
      setCategories(catData);
      setPositions(posData);
      
      if (catData.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: catData[0].name }));
      }
    } catch (error: any) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await api.employees.list();
      setEmployees(data);
    } catch (error: any) {
      toast.error('Failed to fetch employees');
    }
  };

  const fetchEmployeeHistory = async (id: string) => {
    setHistoryLoading(true);
    try {
      const [payroll, deductions, schedules] = await Promise.all([
        api.employees.getPayrollHistory(id),
        api.employees.getDeductionHistory(id),
        api.schedules.getByEmployee(id)
      ]);
      setPayrollHistory(payroll);
      setDeductionHistory(deductions);
      setEmployeeSchedules(schedules);
    } catch (error: any) {
      toast.error('Failed to fetch history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        basicSalary: parseFloat(formData.basicSalary as any)
      };

      if (editingEmployee) {
        await api.employees.update(editingEmployee.id, data);
        toast.success('Employee updated successfully');
      } else {
        await api.employees.create(data);
        toast.success('Employee added successfully');
      }
      
      setIsAddOpen(false);
      setEditingEmployee(null);
      resetForm();
      fetchEmployees();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    setItemToDelete({ id, type: 'employee' });
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    setIsDeleting(true);
    try {
      if (itemToDelete.type === 'employee') {
        await api.employees.delete(itemToDelete.id);
        toast.success('Employee deleted');
        fetchEmployees();
      } else if (itemToDelete.type === 'category') {
        await api.employees.deleteCategory(itemToDelete.id);
        toast.success('Category removed');
        fetchData();
      } else if (itemToDelete.type === 'position') {
        await api.employees.deletePosition(itemToDelete.id);
        toast.success('Position removed');
        fetchData();
      }
      setIsDeleteOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  const handleDeleteAllConfirm = async () => {
    setIsDeletingAll(true);
    try {
      await api.employees.deleteAll();
      toast.success("Successfully deleted all employees from the system!");
      setIsDeleteAllOpen(false);
      fetchEmployees();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete all employees");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      category: categories.length > 0 ? categories[0].name : '',
      basicSalary: 0,
      salaryType: 'monthly',
      status: 'active',
      phoneNumber: '',
      hasSss: false,
      hasPhilhealth: false,
      hasPagibig: false,
      bpno: '',
      mi: '',
      prefix: '',
      appellation: '',
      birthDate: '',
      crn: '',
      effectivityDate: '',
      position: '',
      gender: 'MALE',
      profileImage: '',
      employeeNo: ''
    });
  };

  const handleExcelExport = () => {
    if (filteredEmployees.length === 0) {
      toast.error("No employee records to export.");
      return;
    }

    try {
      const headers = [
        "ID",
        "Employee No.",,
        "Last Name",
        "First Name",
        "MI",
        "Prefix",
        "Appellation",
        "Email",
        "Category",
        "Position",
        "Gender",
        "Birth Date",
        "CRN",
        "Basic Monthly Salary",
        "Effectivity Date",
        "Status",
        "Phone Number",
        "Has SSS",
        "Has PhilHealth",
        "Has Pag-IBIG"
      ];

      const dataRows = filteredEmployees.map(emp => [
        emp.bpno || "",
        emp.employeeNo || "",
        emp.lastName || "",
        emp.firstName || "",
        emp.mi || "",
        emp.prefix || "",
        emp.appellation || "",
        emp.email || "",
        emp.category || "",
        emp.position || "",
        emp.gender || "",
        emp.birthDate || "",
        emp.crn || "",
        emp.basicSalary !== undefined ? Number(emp.basicSalary) : 0,
        emp.effectivityDate || "",
        emp.status || "",
        emp.phoneNumber || "",
        emp.hasSss ? "YES" : "NO",
        emp.hasPhilhealth ? "YES" : "NO",
        emp.hasPagibig ? "YES" : "NO"
      ]);

      // Institution header rows to match formal university report designs
      const titleRows = [
        ["SOUTHERN LEYTE STATE UNIVERSITY", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["Sogod, Southern Leyte", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["HUMAN RESOURCE MANAGEMENT OFFICE", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["OFFICIAL EMPLOYEE DIRECTORY & MASTER ROSTER", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]
      ];

      const sheetData = [...titleRows, headers, ...dataRows];
      const worksheet = XLSXStyle.utils.aoa_to_sheet(sheetData);

      // Define merge ranges for the upper title rows (columns A to T)
      const merges = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: headers.length - 1 } }
      ];
      worksheet['!merges'] = merges;

      // Force creation and styling of every cell in the 5 title rows so styles apply correctly over merges
      for (let r = 0; r <= 4; r++) {
        for (let c = 0; c < headers.length; c++) {
          const cellRef = XLSXStyle.utils.encode_cell({ r, c });
          if (!worksheet[cellRef]) {
            worksheet[cellRef] = { t: "s", v: "" };
          }
        }
      }

      // Apply gorgeous institutional typography and alignments for the title block
      // Row 0: University Name
      for (let c = 0; c < headers.length; c++) {
        const cellRef = XLSXStyle.utils.encode_cell({ r: 0, c });
        worksheet[cellRef].s = {
          font: { name: "Segoe UI", sz: 14, bold: true, color: { rgb: "0D5C34" } }, // SLSU Forest Green
          alignment: { horizontal: "center", vertical: "center" }
        };
      }

      // Row 1: Location/Address
      for (let c = 0; c < headers.length; c++) {
        const cellRef = XLSXStyle.utils.encode_cell({ r: 1, c });
        worksheet[cellRef].s = {
          font: { name: "Segoe UI", sz: 9.5, italic: true, color: { rgb: "475569" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }

      // Row 2: Office Name
      for (let c = 0; c < headers.length; c++) {
        const cellRef = XLSXStyle.utils.encode_cell({ r: 2, c });
        worksheet[cellRef].s = {
          font: { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "334155" } },
          alignment: { horizontal: "center", vertical: "center" }
        };
      }

      // Row 3: Document Title with subtle modern colored backdrop
      for (let c = 0; c < headers.length; c++) {
        const cellRef = XLSXStyle.utils.encode_cell({ r: 3, c });
        worksheet[cellRef].s = {
          font: { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "0D5C34" } },
          fill: { fgColor: { rgb: "F0FDF4" } }, // Cohesive Ultra Light Mint tint
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            bottom: { style: "thin", color: { rgb: "86EFAC" } }, // Mint border lines
            top: { style: "thin", color: { rgb: "86EFAC" } }
          }
        };
      }

      // Row 4: Blank spacing row
      for (let c = 0; c < headers.length; c++) {
        const cellRef = XLSXStyle.utils.encode_cell({ r: 4, c });
        worksheet[cellRef].s = {
          fill: { fgColor: { rgb: "FFFFFF" } }
        };
      }

      // Apply gorgeous official styles to the Table Headers (Row index 5)
      for (let i = 0; i < headers.length; i++) {
        const cellRef = XLSXStyle.utils.encode_cell({ r: 5, c: i });
        if (worksheet[cellRef]) {
          worksheet[cellRef].s = {
            font: {
              name: "Segoe UI",
              sz: 10,
              bold: true,
              color: { rgb: "FFFFFF" }
            },
            fill: {
              fgColor: { rgb: "0D5C34" } // Solid Institutional Green Backdrop
            },
            alignment: {
              horizontal: "center",
              vertical: "center",
              wrapText: true
            },
            border: {
              bottom: { style: "medium", color: { rgb: "052C1E" } }, // Thick dark forest bottom indicator
              top: { style: "thin", color: { rgb: "166534" } },
              left: { style: "thin", color: { rgb: "166534" } },
              right: { style: "thin", color: { rgb: "166534" } }
            }
          };
        }
      }

      // Format Data Rows with professional slate gridlines, custom alignment & elegant zebra striping
      for (let r = 6; r < 6 + dataRows.length; r++) {
        const isAlternate = r % 2 === 1;
        const rowBgColor = isAlternate ? "F4F9F4" : "FFFFFF"; // High-end Soft Mint alternative backdrop

        for (let c = 0; c < headers.length; c++) {
          const cellRef = XLSXStyle.utils.encode_cell({ r, c });
          if (worksheet[cellRef]) {
            const cellValue = worksheet[cellRef].v;
            const isNumber = typeof cellValue === 'number';

            // Establish baseline elegant typography, clean colors and bounds
            worksheet[cellRef].s = {
              font: {
                name: "Segoe UI",
                sz: 10,
                color: { rgb: "1E293B" } // High readability deep slate body text
              },
              fill: {
                fgColor: { rgb: rowBgColor }
              },
              alignment: {
                // Pin IDs, Codes, Booleans, Statuses to Center. Align rich fields (names, designations) to Left. Align numbers to Right.
                horizontal: isNumber ? "right" : (c === 0 || c === 1 || c === 4 || c === 5 || c === 6 || c === 10 || c === 11 || c === 12 || c === 14 || c >= 15 ? "center" : "left"),
                vertical: "center"
              },
              border: {
                bottom: { style: "thin", color: { rgb: "CBD5E1" } }, // Soft slate-300 gridlines
                top: { style: "thin", color: { rgb: "CBD5E1" } },
                left: { style: "thin", color: { rgb: "CBD5E1" } },
                right: { style: "thin", color: { rgb: "CBD5E1" } }
              }
            };

            // Custom high contrast formatting for Status values (Active = Lush green, Inactive = Crimson)
            if (c === 15) {
              const statusStr = String(cellValue).trim().toUpperCase();
              if (statusStr === "ACTIVE") {
                worksheet[cellRef].s.font.color = { rgb: "15803D" }; // Forest Green 700
                worksheet[cellRef].s.font.bold = true;
              } else {
                worksheet[cellRef].s.font.color = { rgb: "B91C1C" }; // Red 700
                worksheet[cellRef].s.font.bold = true;
              }
            }

            // Custom elegant color highlight for Gender (MALE = Slate Blue, FEMALE = Soft Cherry Pink)
            if (c === 10) {
              const genderStr = String(cellValue).trim().toUpperCase();
              if (genderStr === "FEMALE") {
                worksheet[cellRef].s.font.color = { rgb: "BE185D" }; // Soft Rose-700
                worksheet[cellRef].s.font.bold = true;
              } else if (genderStr === "MALE") {
                worksheet[cellRef].s.font.color = { rgb: "1D4ED8" }; // Royal Blue-700
                worksheet[cellRef].s.font.bold = true;
              }
            }

            // Bold styling for Employee IDs & ID to stand out structurally
            if (c === 0 || c === 1) {
              worksheet[cellRef].s.font.bold = true;
            }

            // Emphasis/De-emphasis for yes/no optional benefits
            if (c >= 17) {
              const yesNoStr = String(cellValue).trim().toUpperCase();
              if (yesNoStr === "YES") {
                worksheet[cellRef].s.font.color = { rgb: "047857" }; // Cool emerald
                worksheet[cellRef].s.font.bold = true;
              } else {
                worksheet[cellRef].s.font.color = { rgb: "94A3B8" }; // Muted grey
              }
            }

            // Custom currency display formatting for Basic Monthly Salary column with Philippine Peso locale format
            if (c === 13) {
              worksheet[cellRef].z = '"₱"#,##0.00';
            }
          }
        }
      }

      // Configure bespoke row heights for breathability
      const rowHeights = [
        { hpt: 30 }, // Row 1: SOUTHERN LEYTE STATE UNIVERSITY
        { hpt: 18 }, // Row 2: Sogod, Southern Leyte
        { hpt: 20 }, // Row 3: HUMAN RESOURCE MANAGEMENT OFFICE
        { hpt: 24 }, // Row 4: EMPLOYEE DIRECTORY & ROSTER
        { hpt: 12 }, // Row 5: spacer row
        { hpt: 32 }, // Row 6: Table headers
      ];
      for (let r = 0; r < dataRows.length; r++) {
        rowHeights.push({ hpt: 22 }); // Data rows: beautifully padded
      }
      worksheet['!rows'] = rowHeights;

      // Automatically calculate optimal column widths with custom padding
      const colWidths = headers.map((header, colIndex) => {
        let maxLen = header.length;
        dataRows.forEach(row => {
          const val = row[colIndex];
          const valLen = val ? String(val).length : 0;
          if (valLen > maxLen) {
            maxLen = valLen;
          }
        });
        // Limit width to min 12, max 35 for balanced aesthetic wrap
        return { wch: Math.min(Math.max(maxLen + 4, 12), 35) };
      });
      worksheet['!cols'] = colWidths;

      const workbook = XLSXStyle.utils.book_new();
      XLSXStyle.utils.book_append_sheet(workbook, worksheet, "Employee Directory");
      XLSXStyle.writeFile(workbook, `Employees_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Employees database exported to Excel with beautiful collegiate designs!");
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to export employees to Excel.");
    }
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        // Parse with cellDates: true so SheetJS automatically converts date columns to Native JS Date objects which are easy to format
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Read as 2D array to find the true header row below metadata
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[];

        if (rawRows.length === 0) {
          toast.error('The selected sheet is empty');
          return;
        }

        // Helper to format any date input nicely as YYYY-MM-DD
        const formatExcelDate = (val: any) => {
          if (!val) return '';
          if (val instanceof Date) {
            if (isNaN(val.getTime())) return '';
            return val.toISOString().split('T')[0];
          }
          // If it's an Excel serial date number
          if (typeof val === 'number') {
            const date = new Date((val - 25569) * 86400 * 1000);
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          }
          const str = String(val).trim();
          if (!str) return '';
          // Handle standard MM/DD/YYYY format strings
          const matchSlash = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (matchSlash) {
            const month = matchSlash[1].padStart(2, '0');
            const day = matchSlash[2].padStart(2, '0');
            const year = matchSlash[3];
            return `${year}-${month}-${day}`;
          }
          const parsed = Date.parse(str);
          if (!isNaN(parsed)) {
            return new Date(parsed).toISOString().split('T')[0];
          }
          return str;
        };

        // Scan rows to find where the header row is
        let headerRowIndex = -1;
        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (Array.isArray(row)) {
            // Checks if one of the core cells contains ID, BPNO, LastName, FirstName, Name, or Position
            const hasHeaderIndicator = row.some(cell => {
              const str = String(cell || '').trim().toLowerCase();
              return str === 'bpno' || str === 'id' || str === 'lastname' || str === 'firstname' || str === 'name' || str === 'position';
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
          headers = rawRows[headerRowIndex].map((h: any) => String(h || '').trim());
          dataRows = rawRows.slice(headerRowIndex + 1);
        } else {
          // Fallback to standard row 0 as header
          headers = rawRows[0] ? rawRows[0].map((h: any) => String(h || '').trim()) : [];
          dataRows = rawRows.slice(1);
        }

        const mapped = dataRows.map((row: any[]) => {
          if (!Array.isArray(row) || row.length === 0) return null;

          const getVal = (keys: string[]) => {
            for (const key of keys) {
              const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
              const colIdx = headers.findIndex(h => typeof h === 'string' && h.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanKey);
              if (colIdx !== -1 && row[colIdx] !== undefined && row[colIdx] !== null) {
                return row[colIdx];
              }
            }
            return '';
          };

          // Read the matching values
          const bpnoVal = getVal(['ID', 'BPNO']);
          let lastName = getVal(['LastName', 'last_name', 'Surname', 'family_name', 'familyname']);
          let firstName = getVal(['FirstName', 'first_name', 'GivenName', 'given_name']);
          let mi = getVal(['MI', 'middle_initial', 'MiddleInitial', 'mi']);
          let appellation = getVal(['APPELLATION', 'Appellation', 'Suffix', 'ext', 'extension']);
          const prefix = getVal(['PREFIX', 'Prefix']);
          const birthDateRaw = getVal(['BirthDate', 'birth_date', 'Birth_Date', 'Birthday']);
          const crn = getVal(['CRN']);
          const basicSalaryVal = getVal(['Basic Monthly Salary', 'basicSalary', 'salary', 'BasicSalary', 'Basic_Monthly_Salary']);
          const effectivityDateRaw = getVal(['Effectivity Date', 'effectivityDay', 'effectivity_date', 'Effectivity_Date']);
          let positionVal = getVal(['Position', 'position', 'Designation', 'Title', 'JobTitle', 'Job Title', 'Job_Title']);
          const nameVal = getVal(['Name', 'Full Name', 'Employee Name', 'fullname', 'employee_name', 'Employee_Name', 'Full_Name']);
          const genderVal = getVal(['Gender', 'gender', 'Sex', 'sex']);
          let categoryOverride: string | null = null;

          // If lastName / firstName are missing but we have a combined name, let's parse it!
          if (nameVal && !lastName && !firstName) {
            const trimmedName = String(nameVal).trim();
            if (trimmedName.includes(',')) {
              // Format: "Baclayon, Jacinto Jr. P." or multi-comma "Mondragon, G-mar D. ,Instructor I, FACULTY"
              const parts = trimmedName.split(',').map(p => p.trim());
              lastName = parts[0];
              const rest = parts[1] || '';

              const words = rest.split(/\s+/);
              const suffixes = ['jr', 'jr.', 'sr', 'sr.', 'iii', 'ii', 'iv', 'v'];
              let firstWords: string[] = [];
              let foundSuffix = '';
              let foundMi = '';

              for (let idx = 0; idx < words.length; idx++) {
                const w = words[idx];
                const cleanW = w.toLowerCase().replace(/[^a-z0-9]/g, '');

                if (suffixes.includes(cleanW) || (cleanW.match(/^[ivx]+$/) && idx > 0)) {
                  foundSuffix = w;
                } else if (idx === words.length - 1 && w.length <= 2 && w.match(/^[A-Za-z]\.?$/)) {
                  foundMi = w.replace(/\.$/, '');
                } else if (idx === words.length - 2 && words[idx + 1].length <= 2 && words[idx + 1].match(/^[A-Za-z]\.?$/) && suffixes.includes(cleanW)) {
                  foundSuffix = w;
                } else {
                  firstWords.push(w);
                }
              }

              firstName = firstWords.join(' ');
              if (foundMi) mi = foundMi;
              if (foundSuffix) appellation = foundSuffix;

              // Check if any of the remaining parts are position or category
              for (let i = 2; i < parts.length; i++) {
                const part = parts[i].trim();
                if (!part) continue;
                const partLower = part.toLowerCase();
                if (partLower === 'faculty' || partLower === 'staff') {
                  categoryOverride = partLower.toUpperCase();
                } else if (
                  partLower.includes('instructor') || 
                  partLower.includes('professor') || 
                  partLower.includes('clerk') || 
                  partLower.includes('officer') || 
                  partLower.includes('guard') || 
                  partLower.includes('assistant') || 
                  partLower.includes('asst') ||
                  partLower.includes('driver') ||
                  partLower.includes('cashier') ||
                  partLower.includes('custodian') ||
                  partLower.includes('counselor')
                ) {
                  positionVal = part;
                }
              }
            } else {
              // Space-separated fallback "Jacinto P. Baclayon"
              const words = trimmedName.split(/\s+/);
              if (words.length >= 2) {
                const suffixes = ['jr', 'jr.', 'sr', 'sr.', 'iii', 'ii', 'iv', 'v'];
                let cleanLastWord = words[words.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '');
                let lastNameIdx = words.length - 1;
                
                if (suffixes.includes(cleanLastWord) && words.length >= 3) {
                  appellation = words[words.length - 1];
                  lastNameIdx = words.length - 2;
                }
                lastName = words[lastNameIdx];
                if (lastNameIdx >= 2 && words[lastNameIdx - 1].length <= 2 && words[lastNameIdx - 1].match(/^[A-Za-z]\.?$/)) {
                  mi = words[lastNameIdx - 1].replace(/\.$/, '');
                  firstName = words.slice(0, lastNameIdx - 1).join(' ');
                } else {
                  firstName = words.slice(0, lastNameIdx).join(' ');
                }
              } else {
                firstName = trimmedName;
              }
            }
          }

          // If row is empty or completely missing name, skip
          if (!lastName && !firstName && !bpnoVal) return null;

          // Align format of date fields
          const birthDate = formatExcelDate(birthDateRaw);
          const effectivityDate = formatExcelDate(effectivityDateRaw);

          // Use BPNO as employee ID, standard fallback is SLSU generated
          const employeeId = bpnoVal ? String(bpnoVal).trim() : `SLSU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          // Generate a clean professional SLSU email address from name
          const cleanFirst = String(firstName || 'staff').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanLast = String(lastName || 'slsu').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, '');
          const email = `${cleanFirst}.${cleanLast}@slsu.edu.ph`;

          // Resolve Position based on the name of employee mapping
          let resolvedPosition = String(positionVal || '').trim();
          const firstLower = cleanFirst;
          const lastLower = cleanLast;

          let forceFacultyCategory = false;
          let forceStaffCategory = false;

          if (lastLower.includes('amod') && firstLower.includes('gary')) {
            resolvedPosition = 'Security Guard II';
            forceStaffCategory = true;
          } else if (lastLower.includes('bugais') && firstLower.includes('noel')) {
            resolvedPosition = 'Admin Officer IV';
            forceStaffCategory = true;
          } else if (lastLower.includes('butac') && firstLower.includes('cyclaus')) {
            resolvedPosition = 'ADA6(Clerk3)';
            forceStaffCategory = true;
          } else if (lastLower.includes('fiel') && firstLower.includes('ernie')) {
            resolvedPosition = 'FAWK II';
            forceStaffCategory = true;
          } else if (lastLower.includes('humangit') && firstLower.includes('antonio')) {
            resolvedPosition = 'ADA IV';
            forceStaffCategory = true;
          } else if (lastLower.includes('molita') && (firstLower.includes('chris') || firstLower.includes('jirah'))) {
            resolvedPosition = 'Records Officer I';
            forceStaffCategory = true;
          } else if (lastLower.includes('mulig') && firstLower.includes('gamebert')) {
            resolvedPosition = 'A.O. 5';
            forceStaffCategory = true;
          } else if (lastLower.includes('pasayan') && firstLower.includes('jonathan')) {
            resolvedPosition = 'ADAS V';
            forceStaffCategory = true;
          } else if (lastLower.includes('quintana') && firstLower.includes('ariel')) {
            resolvedPosition = 'Property Custodian';
            forceStaffCategory = true;
          } else if (lastLower.includes('roculas') && firstLower.includes('roland')) {
            resolvedPosition = 'FAWK II';
            forceStaffCategory = true;
          } else if (lastLower.includes('rojas') && firstLower.includes('joselito')) {
            resolvedPosition = 'Cashier II';
            forceStaffCategory = true;
          } else if (lastLower.includes('valerio') && (firstLower.includes('glen') || firstLower.includes('zimore'))) {
            resolvedPosition = 'Clerk III';
            forceStaffCategory = true;
          } else if (lastLower.includes('agad') && firstLower.includes('rosebeb')) {
            resolvedPosition = 'Clerk III';
            forceStaffCategory = true;
          } else if (lastLower.includes('batiancila') && firstLower.includes('sebian')) {
            resolvedPosition = 'Budgeting Assistant';
            forceStaffCategory = true;
          } else if (lastLower.includes('bugaispagobo') || (lastLower.includes('bugais') && lastLower.includes('pagobo')) || (lastLower.includes('pagobo') && firstLower.includes('charisse'))) {
            resolvedPosition = 'Guidance Counselor II';
            forceStaffCategory = true;
          } else if (lastLower.includes('caberte') && (firstLower.includes('leslie') || firstLower.includes('anne'))) {
            resolvedPosition = 'Accountant II';
            forceStaffCategory = true;
          } else if (lastLower.includes('carbonilla') && (firstLower.includes('joje') || firstLower.includes('marie'))) {
            resolvedPosition = 'ADAS II( M& Aud.Ast)';
            forceStaffCategory = true;
          } else if (lastLower.includes('cuenco') && firstLower.includes('rubie')) {
            resolvedPosition = 'Clerk III';
            forceStaffCategory = true;
          } else if (lastLower.includes('cruzada') && firstLower.includes('marjorie')) {
            resolvedPosition = 'Cash Clerk';
            forceStaffCategory = true;
          } else if (lastLower.includes('delacruz') || (lastLower.includes('cruz') && firstLower.includes('chanson'))) {
            resolvedPosition = 'Clerk III';
            forceStaffCategory = true;
          } else if (lastLower.includes('marucot') && firstLower.includes('azila')) {
            resolvedPosition = 'ADOF 3 (SuppOfficer I)';
            forceStaffCategory = true;
          } else if (lastLower.includes('orias') && (firstLower.includes('carol') || firstLower.includes('ann'))) {
            resolvedPosition = 'HRMO II';
            forceStaffCategory = true;
          } else if (lastLower.includes('paug') && firstLower.includes('febie')) {
            resolvedPosition = 'Supply Officer I';
            forceStaffCategory = true;
          } else if (lastLower.includes('sinahon') && (firstLower.includes('chrestian') || firstLower.includes('jede'))) {
            resolvedPosition = 'ADA VI (Clerk III)';
            forceStaffCategory = true;
          } else if (lastLower.includes('tiin') && firstLower.includes('clarish')) {
            resolvedPosition = 'ADAS3 (SenBkpr)';
            forceStaffCategory = true;
          } else if (lastLower.includes('baclayon') && firstLower.includes('jacinto')) {
            resolvedPosition = 'Assistant Professor IV';
            forceFacultyCategory = true;
          } else if (lastLower.includes('balili') && firstLower.includes('danilo')) {
            resolvedPosition = ''; // Blank as in image
            forceFacultyCategory = true;
          } else if (lastLower.includes('gapasin') && (firstLower.includes('john') || firstLower.includes('paul'))) {
            resolvedPosition = 'Asst. Prof III';
            forceFacultyCategory = true;
          } else if (lastLower.includes('granada') && firstLower.includes('dominador')) {
            resolvedPosition = 'Assistant Professor I';
            forceFacultyCategory = true;
          } else if (lastLower.includes('lim') && firstLower.includes('wade')) {
            resolvedPosition = 'Associate Professor II';
            forceFacultyCategory = true;
          } else if (lastLower.includes('manunog') || lastLower.includes('manun-og')) {
            forceFacultyCategory = true;
            if (firstLower.includes('mondani')) {
              resolvedPosition = 'Associate Professor II';
            } else if (firstLower.includes('ruther')) {
              resolvedPosition = 'Assistant Professor II';
            } else if (firstLower.includes('madelyn')) {
              resolvedPosition = 'Assistant Professor IV';
            }
          } else if (lastLower.includes('mondragon') && (firstLower.includes('gmar') || firstLower.includes('g-mar'))) {
            resolvedPosition = 'Instructor I';
            forceFacultyCategory = true;
          } else if (lastLower.includes('napala') && firstLower.includes('irvin')) {
            resolvedPosition = 'Associate Professor';
            forceFacultyCategory = true;
          } else if (lastLower.includes('navarrete') && firstLower.includes('ian')) {
            resolvedPosition = 'Associate Professor IV';
            forceFacultyCategory = true;
          } else if (lastLower.includes('almine') && firstLower.includes('mary')) {
            resolvedPosition = 'Instructor I';
            forceFacultyCategory = true;
          } else if (lastLower.includes('aquino') && (firstLower.includes('ana') || firstLower.includes('mae'))) {
            resolvedPosition = 'Instructor I';
            forceFacultyCategory = true;
          } else if (lastLower.includes('capapas') && firstLower.includes('meryl')) {
            resolvedPosition = 'Assistant Professor I';
            forceFacultyCategory = true;
          } else if (lastLower.includes('cupat') && firstLower.includes('leonisa')) {
            resolvedPosition = 'Instructor I';
            forceFacultyCategory = true;
          } else if (lastLower.includes('membreve') && firstLower.includes('christselda')) {
            resolvedPosition = 'Instructor I';
            forceFacultyCategory = true;
          } else if ((lastLower.includes('nunez') || lastLower.includes('nuñez')) && firstLower.includes('edelyn')) {
            resolvedPosition = 'Instructor I';
            forceFacultyCategory = true;
          } else if (lastLower.includes('piamonte') && firstLower.includes('rojelyn')) {
            resolvedPosition = 'Instructor I';
            forceFacultyCategory = true;
          } else if (lastLower.includes('pernites') && (firstLower.includes('emma') || firstLower.includes('suzette') || firstLower.includes('ma'))) {
            resolvedPosition = 'Assistant Professor I';
            forceFacultyCategory = true;
          } else if ((lastLower.includes('pille') || lastLower.includes('plana')) && firstLower.includes('roxan')) {
            resolvedPosition = 'Assistant Professor III';
            forceFacultyCategory = true;
          } else if (lastLower.includes('regis') && (firstLower.includes('mary') || firstLower.includes('jully') || firstLower.includes('ann'))) {
            resolvedPosition = 'Associate Professor III';
            forceFacultyCategory = true;
          } else if (lastLower.includes('rosolada') && firstLower.includes('romecita')) {
            resolvedPosition = 'Professor VI';
            forceFacultyCategory = true;
          } else if (lastLower.includes('saludsod') && (firstLower.includes('mary') || firstLower.includes('beth'))) {
            resolvedPosition = 'Associate Professor V';
            forceFacultyCategory = true;
          }

          // Guess category based on position
          let resolvedCategory = 'Regular Employee';
          if (categoryOverride) {
            resolvedCategory = categoryOverride;
          } else if (forceFacultyCategory) {
            resolvedCategory = 'FACULTY';
          } else if (forceStaffCategory) {
            resolvedCategory = 'STAFF';
          } else if (resolvedPosition) {
            const cleanPos = resolvedPosition.toLowerCase();
            if (
              cleanPos.includes('faculty') ||
              cleanPos.includes('professor') ||
              cleanPos.includes('prof') ||
              cleanPos.includes('instructor') ||
              cleanPos.includes('teacher') ||
              cleanPos.includes('lecturer')
            ) {
              resolvedCategory = 'FACULTY';
            } else if (
              cleanPos.includes('staff') ||
              cleanPos.includes('admin') ||
              cleanPos.includes('clerk') ||
              cleanPos.includes('office') ||
              cleanPos.includes('accountant') ||
              cleanPos.includes('visitor') ||
              cleanPos.includes('registrar') ||
              cleanPos.includes('guard') ||
              cleanPos.includes('driver') ||
              cleanPos.includes('cashier') ||
              cleanPos.includes('fawk') ||
              cleanPos.includes('custodian') ||
              cleanPos.includes('budg') ||
              cleanPos.includes('counselor') ||
              cleanPos.includes('hrmo') ||
              cleanPos.includes('supply') ||
              cleanPos.includes('adas') ||
              cleanPos.includes('ada')
            ) {
              resolvedCategory = 'STAFF';
            }
          }

          return {
            bpno: String(bpnoVal || '').trim(),
            employeeId: String(employeeId),
            lastName: String(lastName || '').trim(),
            firstName: String(firstName || '').trim(),
            mi: String(mi || '').trim(),
            prefix: String(prefix || '').trim(),
            appellation: String(appellation || '').trim(),
            birthDate,
            crn: String(crn || '').trim(),
            basicSalary: parseFloat(basicSalaryVal) || 0,
            effectivityDate,
            email,
            password: `${cleanLast}123`,
            category: resolvedCategory,
            salaryType: 'monthly',
            phoneNumber: '09171234567',
            hasSss: true,
            hasPhilhealth: true,
            hasPagibig: true,
            position: resolvedPosition,
            gender: (() => {
              let finalGender = String(genderVal || '').toUpperCase().trim();
              if (finalGender !== 'MALE' && finalGender !== 'FEMALE') {
                const lName = String(lastName || '').toUpperCase().trim();
                const fName = String(firstName || '').toUpperCase().trim();
                const femaleLastNames = [
                  'AGAD', 'ALMINE', 'BATIANCILA', 'BRUN', 'BUGAIS-PAGOBO', 'CABERTE', 'CAPAPAS', 
                  'CARBONILLA', 'CRUZADA', 'CUENCO', 'CUPAT', 'CUTA', 'MARUCOT', 'MEMBREVE', 'NUÑEZ', 
                  'ORIAS', 'PAUG', 'PERNITES', 'PIAMONTE', 'PLANA', 'ROSOLADA', 'TIIN', 'DE LA CRUZ',
                  'SALUDSOD'
                ];
                if (lName === 'SINAHON') {
                  if (fName.includes('CHRESTIAN') || fName.includes('JEDE')) {
                    finalGender = 'FEMALE';
                  } else {
                    finalGender = 'MALE';
                  }
                } else if (femaleLastNames.includes(lName) || fName.includes('MARY') || fName.includes('FEMALE')) {
                  finalGender = 'FEMALE';
                } else {
                  finalGender = 'MALE';
                }
              }
              return finalGender;
            })()
          };
        }).filter((emp): emp is any => emp !== null);

        if (mapped.length === 0) {
          toast.error('No valid employee records found in sheet');
          return;
        }

        setImportData(mapped);
        setIsImportPreviewOpen(true);
      } catch (error: any) {
        toast.error('Failed to parse Excel file: ' + error.message);
      }
    };

    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = async () => {
    setImportLoading(true);
    try {
      const response = await api.employees.bulkCreate(importData);
      if (response.success) {
        toast.success(`Successfully imported ${response.count} employees!`);
        if (response.skipped && response.skipped.length > 0) {
          toast.warning(`Skipped ${response.skipped.length} duplicate/invalid records.`);
        }
        setIsImportPreviewOpen(false);
        setImportData([]);
        fetchData();
      } else {
        toast.error(response.error || 'Failed to complete import');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error occurred during import');
    } finally {
      setImportLoading(false);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.employees.updateCategory(editingCategory.id, categoryFormData);
        toast.success('Category updated successfully');
      } else {
        await api.employees.createCategory(categoryFormData);
        toast.success('Category added successfully');
      }
      setIsAddCategoryOpen(false);
      setEditingCategory(null);
      setCategoryFormData({ name: '', description: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setItemToDelete({ id, type: 'category' });
    setIsDeleteOpen(true);
  };

  const handlePositionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPosition) {
        await api.employees.updatePosition(editingPosition.id, positionFormData);
        toast.success('Position updated successfully');
      } else {
        await api.employees.createPosition(positionFormData);
        toast.success('Position added successfully');
      }
      setIsAddPositionOpen(false);
      setEditingPosition(null);
      setPositionFormData({ name: '', description: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeletePosition = async (id: string) => {
    setItemToDelete({ id, type: 'position' });
    setIsDeleteOpen(true);
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || emp.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || emp.status === filterStatus;
    const matchesSalaryType = filterSalaryType === 'all' || emp.salaryType === filterSalaryType;
    return matchesSearch && matchesCategory && matchesStatus && matchesSalaryType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'inactive': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900">Employees</h2>
          <p className="text-neutral-500">Manage your university staff and their base information.</p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isManageCategoriesOpen} onOpenChange={setIsManageCategoriesOpen}>
            <DialogTrigger render={(props) => (
              <Button {...props} variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Manage Categories
              </Button>
            )} />
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Manage Employee Categories</DialogTitle>
                <DialogDescription>
                  Edit or remove existing staff categories.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="divide-y divide-neutral-100 border rounded-lg overflow-auto max-h-[300px] custom-scrollbar">
                  {categories.map(cat => (
                    <div key={cat.id} className="p-3 flex items-center justify-between bg-white hover:bg-neutral-50 transition-colors">
                      <div>
                        <div className="font-medium text-sm">{cat.name}</div>
                        <div className="text-xs text-neutral-500">{cat.description || 'No description'}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-neutral-400 hover:text-neutral-900"
                          onClick={() => {
                            setEditingCategory(cat);
                            setCategoryFormData({ name: cat.name, description: cat.description || '' });
                            setIsAddCategoryOpen(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-neutral-400 hover:text-red-600"
                          onClick={() => handleDeleteCategory(cat.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <div className="p-4 text-center text-sm text-neutral-500">No categories defined.</div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryFormData({ name: '', description: '' });
                    setIsAddCategoryOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Add New Category
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddCategoryOpen} onOpenChange={(open) => {
            setIsAddCategoryOpen(open);
            if (!open) {
              setEditingCategory(null);
              setCategoryFormData({ name: '', description: '' });
            }
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'Edit' : 'Add'} Category</DialogTitle>
                <DialogDescription>
                  {editingCategory ? 'Modify the details of this staff category.' : 'Create a new category for employees.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCategorySubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="catName">Category Name</Label>
                  <Input 
                    id="catName" 
                    placeholder="e.g. Teaching Staff" 
                    value={categoryFormData.name}
                    onChange={e => setCategoryFormData({...categoryFormData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="catDesc">Description</Label>
                  <Input 
                    id="catDesc" 
                    placeholder="Brief description of this category" 
                    value={categoryFormData.description}
                    onChange={e => setCategoryFormData({...categoryFormData, description: e.target.value})}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full bg-neutral-900 text-white">
                    {editingCategory ? 'Update Category' : 'Save Category'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isManagePositionsOpen} onOpenChange={setIsManagePositionsOpen}>
            <DialogTrigger render={(props) => (
              <Button {...props} variant="outline" className="gap-2">
                <Briefcase className="w-4 h-4" />
                Manage Positions
              </Button>
            )} />
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Manage Employee Positions</DialogTitle>
                <DialogDescription>
                  Edit or remove existing staff positions.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="divide-y divide-neutral-100 border rounded-lg overflow-auto max-h-[300px] custom-scrollbar">
                  {positions.map(pos => (
                    <div key={pos.id} className="p-3 flex items-center justify-between bg-white hover:bg-neutral-50 transition-colors">
                      <div>
                        <div className="font-medium text-sm">{pos.name}</div>
                        <div className="text-xs text-neutral-500">{pos.description || 'No description'}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-neutral-400 hover:text-neutral-900"
                          onClick={() => {
                            setEditingPosition(pos);
                            setPositionFormData({ name: pos.name, description: pos.description || '' });
                            setIsAddPositionOpen(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-neutral-400 hover:text-red-600"
                          onClick={() => handleDeletePosition(pos.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {positions.length === 0 && (
                    <div className="p-4 text-center text-sm text-neutral-500">No positions defined.</div>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => {
                    setEditingPosition(null);
                    setPositionFormData({ name: '', description: '' });
                    setIsAddPositionOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Add New Position
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddPositionOpen} onOpenChange={(open) => {
            setIsAddPositionOpen(open);
            if (!open) {
              setEditingPosition(null);
              setPositionFormData({ name: '', description: '' });
            }
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingPosition ? 'Edit' : 'Add'} Position</DialogTitle>
                <DialogDescription>
                  {editingPosition ? 'Modify the details of this staff position.' : 'Create a new position for employees.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handlePositionSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="posName">Position Name</Label>
                  <Input 
                    id="posName" 
                    placeholder="e.g. Assistant Professor IV" 
                    value={positionFormData.name}
                    onChange={e => setPositionFormData({...positionFormData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="posDesc">Description</Label>
                  <Input 
                    id="posDesc" 
                    placeholder="Brief description of this position" 
                    value={positionFormData.description}
                    onChange={e => setPositionFormData({...positionFormData, description: e.target.value})}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full bg-neutral-900 text-white">
                    {editingPosition ? 'Update Position' : 'Save Position'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Button variant="outline" className="gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4" />
            Import Excel
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".xlsx, .xls" 
            onChange={handleExcelImport}
          />

          <Button variant="outline" className="gap-2" onClick={handleExcelExport}>
            <Download className="w-4 h-4" />
            Export
          </Button>

          <Button variant="outline" className="gap-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border-red-200" onClick={() => setIsDeleteAllOpen(true)}>
            <Trash2 className="w-4 h-4" />
            Delete All Employees
          </Button>
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) {
              setEditingEmployee(null);
              resetForm();
            }
          }}>
            <DialogTrigger render={(props) => (
              <Button {...props} className="bg-neutral-900 text-white gap-2">
                <Plus className="w-4 h-4" />
                Add Employee
              </Button>
            )} />
            <DialogContent className="sm:max-w-[650px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
              <DialogHeader className="p-6 pb-2 shrink-0">
                <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
                <DialogDescription>
                  Enter the employee's details below. Fill in core fields and additional HR metrics.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 custom-scrollbar">
                {/* Profile Image Upload Component */}
                <div className="flex flex-col items-center justify-center p-4 border border-dashed border-neutral-200 rounded-xl bg-neutral-50/50 gap-3">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-white border-2 border-neutral-200 shadow-sm flex items-center justify-center overflow-hidden">
                      {formData.profileImage ? (
                        <img 
                          src={formData.profileImage} 
                          alt="Profile Preview" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <User className="w-12 h-12 text-neutral-400" />
                      )}
                    </div>
                    {formData.profileImage && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, profileImage: '' })}
                        className="absolute -top-1 -right-1 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors border border-red-200"
                        title="Remove photo"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Label 
                      htmlFor="profile-upload" 
                      className="cursor-pointer text-xs font-bold text-neutral-800 bg-white border border-neutral-200 hover:bg-neutral-50 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                    >
                      Choose Profile Photo
                    </Label>
                    <input 
                      id="profile-upload" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 20 * 1024 * 1024) {
                            toast.error("Image file is too large! Maximum limit is 20MB.");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              setFormData({ ...formData, profileImage: event.target.result as string });
                              toast.success("Profile photo loaded successfully!");
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <p className="text-[10px] text-neutral-400">Supported formats: JPG, PNG. Max size: 20MB.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employeeNo">Employee No.</Label>
                    <Input 
                      id="employeeNo" 
                      placeholder="e.g. 188" 
                      value={formData.employeeNo}
                      onChange={e => setFormData({...formData, employeeNo: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bpno">ID</Label>
                    <Input 
                      id="bpno" 
                      placeholder="e.g. 200012345" 
                      value={formData.bpno}
                      onChange={e => setFormData({...formData, bpno: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={v => {
                        let newSalType = formData.salaryType;
                        if (v === 'Regular Employee') newSalType = 'monthly';
                        else if (v === 'Job Order') newSalType = 'daily';
                        else if (v === 'Visiting Instructor') newSalType = 'hourly';
                        setFormData({...formData, category: v, salaryType: newSalType});
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="crn">CRN</Label>
                    <Input 
                      id="crn" 
                      placeholder="CRN Identifier" 
                      value={formData.crn}
                      onChange={e => setFormData({...formData, crn: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-4">
                  <div className="space-y-2 col-span-5">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      placeholder="John" 
                      value={formData.firstName}
                      onChange={e => setFormData({...formData, firstName: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="mi">MI</Label>
                    <Input 
                      id="mi" 
                      placeholder="M.I." 
                      value={formData.mi}
                      onChange={e => setFormData({...formData, mi: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2 col-span-5">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      placeholder="Doe" 
                      value={formData.lastName}
                      onChange={e => setFormData({...formData, lastName: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prefix">Prefix (e.g. Dr., Prof.)</Label>
                    <Input 
                      id="prefix" 
                      placeholder="Mr. / Ms. / Dr." 
                      value={formData.prefix}
                      onChange={e => setFormData({...formData, prefix: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appellation">Appellation / Suffix (e.g. Jr., III)</Label>
                    <Input 
                      id="appellation" 
                      placeholder="Jr. / Sr. / III" 
                      value={formData.appellation}
                      onChange={e => setFormData({...formData, appellation: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position" className="text-xs font-bold text-neutral-600 font-sans">Position</Label>
                  <Select 
                    value={formData.position || ''} 
                    onValueChange={v => setFormData({...formData, position: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map(pos => (
                        <SelectItem key={pos.id} value={pos.name}>{pos.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Birth Date</Label>
                    <Input 
                      id="birthDate" 
                      type="date" 
                      value={formData.birthDate || ''} 
                      onChange={e => setFormData({...formData, birthDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="effectivityDate">Effectivity Date</Label>
                    <Input 
                      id="effectivityDate" 
                      type="date" 
                      value={formData.effectivityDate || ''} 
                      onChange={e => setFormData({...formData, effectivityDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select 
                      value={formData.gender || 'MALE'} 
                      onValueChange={v => setFormData({...formData, gender: v})}
                    >
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">MALE</SelectItem>
                        <SelectItem value="FEMALE">FEMALE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="john.doe@slsu.edu.ph" 
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input 
                        id="phoneNumber" 
                        placeholder="e.g. 09171234567" 
                        value={formData.phoneNumber}
                        onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Login Password</Label>
                  <div className="relative">
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      required={!editingEmployee}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {editingEmployee && <p className="text-[10px] text-neutral-400">Leave blank to keep current password</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="basicSalary">
                      {formData.category === 'Regular Employee' ? 'Monthly Salary (PHP)' :
                       formData.category === 'Job Order' ? 'Rate per Day / Hour (PHP)' :
                       formData.category === 'Visiting Instructor' ? 'Rate per Hour / Unit (PHP)' :
                       'Basic Salary Amount'}
                    </Label>
                    <Input 
                      id="basicSalary" 
                      type="number" 
                      placeholder="0.00" 
                      value={isNaN(formData.basicSalary) ? '' : formData.basicSalary}
                      onChange={e => setFormData({...formData, basicSalary: parseFloat(e.target.value)})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salaryType">Salary Type</Label>
                    <Select 
                      value={formData.salaryType} 
                      onValueChange={v => setFormData({...formData, salaryType: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.category === 'Regular Employee' && (
                          <>
                            <SelectItem value="monthly">30 days - Monthly Salary</SelectItem>
                            <SelectItem value="semi-monthly">15 days - Half Monthly Salary</SelectItem>
                          </>
                        )}
                        {formData.category === 'Job Order' && (
                          <>
                            <SelectItem value="daily">Daily Rate</SelectItem>
                            <SelectItem value="hourly">Hourly Rate</SelectItem>
                          </>
                        )}
                        {formData.category === 'Visiting Instructor' && (
                          <>
                            <SelectItem value="hourly">Per Hour / Unit Rate</SelectItem>
                          </>
                        )}
                        {!['Regular Employee', 'Job Order', 'Visiting Instructor'].includes(formData.category) && (
                          <>
                            <SelectItem value="monthly">30 days - Monthly Salary</SelectItem>
                            <SelectItem value="semi-monthly">15 days - Half Monthly Salary</SelectItem>
                            <SelectItem value="daily">Daily Rate</SelectItem>
                            <SelectItem value="hourly">Hourly Rate</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Benefits Configuration */}
                {formData.category === 'Regular Employee' && (
                  <div className="space-y-2 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                    <h5 className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Core Benefits (Fixed)</h5>
                    <p className="text-[10px] text-neutral-400">Regular employees automatically receive full social benefits deduction matching standard rates during calculations.</p>
                    <div className="grid grid-cols-2 gap-2 mt-1 px-1 text-[11px] text-neutral-700 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span> SSS Contribution (4.5%)
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span> PhilHealth Contribution (1.5%)
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span> Pag-IBIG Funding (2.0%)
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span> Subject to Income Tax
                      </div>
                    </div>
                  </div>
                )}

                {formData.category === 'Job Order' && (
                  <div className="space-y-2 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                    <div>
                      <h5 className="text-[11px] font-bold text-neutral-600 uppercase tracking-widest">Configure Benefits</h5>
                      <p className="text-[10px] text-neutral-400">Configure which optional core benefits are enabled for this contractual position.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 pt-1 font-medium">
                      <label className="flex items-center gap-2 cursor-pointer text-xs select-none text-neutral-700">
                        <input 
                          type="checkbox" 
                          className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
                          checked={formData.hasSss}
                          onChange={e => setFormData({...formData, hasSss: e.target.checked})}
                        />
                        <span>Enable SSS Contribution (4.5%)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs select-none text-neutral-700">
                        <input 
                          type="checkbox" 
                          className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
                          checked={formData.hasPhilhealth}
                          onChange={e => setFormData({...formData, hasPhilhealth: e.target.checked})}
                        />
                        <span>Enable PhilHealth Contribution (1.5%)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs select-none text-neutral-700">
                        <input 
                          type="checkbox" 
                          className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
                          checked={formData.hasPagibig}
                          onChange={e => setFormData({...formData, hasPagibig: e.target.checked})}
                        />
                        <span>Enable Pag-IBIG Funding (2.0%)</span>
                      </label>
                    </div>
                  </div>
                )}

                {formData.category === 'Visiting Instructor' && (
                  <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-[11px] text-neutral-600 leading-relaxed">
                    <p className="font-bold uppercase tracking-widest text-[11px] text-neutral-500 mb-0.5">Flexible Workload Compensation</p>
                    Visiting Instructors are paid strictly based on workload units or teaching hours rendered. Normal recurring government benefits calculations do not apply by default.
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={v => setFormData({...formData, status: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full bg-neutral-900 text-white">
                    {editingEmployee ? 'Update Employee' : 'Save Employee'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input 
              placeholder="Search by name or ID..." 
              className="pl-10 bg-white border-neutral-200"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px] bg-white">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSalaryType} onValueChange={setFilterSalaryType}>
              <SelectTrigger className="w-[150px] bg-white">
                <SelectValue placeholder="Salary Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="monthly">Monthly (30d)</SelectItem>
                <SelectItem value="semi-monthly">Semi-Monthly (15d)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px] bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-neutral-500"
              onClick={() => {
                setSearchTerm('');
                setFilterCategory('all');
                setFilterStatus('all');
                setFilterSalaryType('all');
              }}
            >
              Reset
            </Button>
          </div>
        </div>
        <div className="overflow-auto custom-scrollbar max-h-[600px]">
          <Table>
            <TableHeader>
            <TableRow className="bg-neutral-50/50">
              <TableHead className="w-[300px]">Employee</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Salary Rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-neutral-900"></div>
                    Loading employees...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-neutral-500">
                  No employees found.
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((emp) => (
                <TableRow key={emp.id} className="hover:bg-neutral-50/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center font-bold text-neutral-600 overflow-hidden">
                        {emp.profileImage ? (
                          <img 
                            src={emp.profileImage} 
                            alt={`${emp.firstName} ${emp.lastName}`} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span>{emp.firstName ? emp.firstName[0] : ''}{emp.lastName ? emp.lastName[0] : ''}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-neutral-900">
                          {emp.prefix ? `${emp.prefix} ` : ''}
                          {emp.lastName}, {emp.firstName}
                          {emp.mi ? ` ${emp.mi}` : ''}
                          {emp.appellation ? ` ${emp.appellation}` : ''}
                        </div>
                        <div className="text-xs text-neutral-400 font-mono flex flex-wrap gap-x-2 gap-y-0.5">
                          {emp.bpno && <span>ID: {emp.bpno}</span>}
                          {emp.employeeNo && <span>• Emp. No.: {emp.employeeNo}</span>}
                          {emp.crn && <span>• CRN: {emp.crn}</span>}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-neutral-800 text-xs">
                      {emp.position || (
                        <span className="text-neutral-400 italic font-medium">No Position</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize font-medium">
                      {emp.category.replace('-', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-sm tracking-widest ${
                      emp.gender === 'FEMALE' ? 'bg-pink-50 text-pink-700 border border-pink-100' : 'bg-sky-50 text-sky-700 border border-sky-100'
                    }`}>
                      {emp.gender || 'MALE'}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>₱{formatCurrency(emp.basicSalary)}</div>
                    <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                      {emp.salaryType === 'semi-monthly' ? '15 days' : 
                       emp.salaryType === 'monthly' ? '30 days' : 
                       emp.salaryType}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(emp.status)}>
                      {emp.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                    <DropdownMenuTrigger render={(props) => (
                        <Button {...props} variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      )} />
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem className="gap-2" onClick={() => {
                          setSelectedEmployee(emp);
                          setIsDetailsOpen(true);
                          fetchEmployeeHistory(emp.id);
                        }}>
                          <FileText className="w-4 h-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2" onClick={() => {
                          setEditingEmployee(emp);
                          setFormData({
                            employeeId: emp.employeeId,
                            firstName: emp.firstName,
                            lastName: emp.lastName,
                            email: emp.email,
                            password: emp.password || '',
                            category: emp.category,
                            basicSalary: emp.basicSalary,
                            salaryType: emp.salaryType || 'monthly',
                            status: emp.status,
                            phoneNumber: emp.phoneNumber || '',
                            hasSss: emp.hasSss === 1 || !!emp.hasSss,
                            hasPhilhealth: emp.hasPhilhealth === 1 || !!emp.hasPhilhealth,
                            hasPagibig: emp.hasPagibig === 1 || !!emp.hasPagibig,
                            bpno: emp.bpno || '',
                            mi: emp.mi || '',
                            prefix: emp.prefix || '',
                            appellation: emp.appellation || '',
                            birthDate: emp.birthDate || '',
                            crn: emp.crn || '',
                            effectivityDate: emp.effectivityDate || '',
                            position: emp.position || '',
                            gender: emp.gender || 'MALE',
                            profileImage: emp.profileImage || '',
                            employeeNo: emp.employeeNo || ''
                          });
                          setIsAddOpen(true);
                        }}>
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-red-600 focus:text-red-600" onClick={() => handleDelete(emp.id)}>
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>

      {/* Employee Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl bg-neutral-50/50">
          {selectedEmployee && (
            <div className="flex flex-col md:flex-row h-full min-h-[600px]">
              {/* Left Sidebar - Profile Summary */}
              <div className="w-full md:w-[280px] bg-white border-r border-neutral-100 p-8 flex flex-col items-center text-center shrink-0">
                <div className="w-32 h-32 rounded-3xl bg-neutral-900 p-1 shadow-2xl mb-6 rotate-3 hover:rotate-0 transition-transform duration-500 overflow-hidden flex items-center justify-center">
                  {selectedEmployee.profileImage ? (
                    <img 
                      src={selectedEmployee.profileImage} 
                      alt={`${selectedEmployee.firstName} ${selectedEmployee.lastName}`} 
                      className="w-full h-full rounded-2xl object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full rounded-2xl bg-neutral-800 flex items-center justify-center text-4xl font-bold text-white border border-neutral-700">
                      {selectedEmployee.firstName[0]}{selectedEmployee.lastName[0]}
                    </div>
                  )}
                </div>
                
                <h2 className="text-xl font-bold text-neutral-900 tracking-tight mb-1">
                  {selectedEmployee.firstName} {selectedEmployee.lastName}
                </h2>
                {selectedEmployee.position && (
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
                    {selectedEmployee.position}
                  </p>
                )}
                <p className="text-xs font-mono text-neutral-400 mb-4">
                  {selectedEmployee.bpno && `ID: ${selectedEmployee.bpno}`}
                  {selectedEmployee.employeeNo && ` • Emp. No.: ${selectedEmployee.employeeNo}`}
                </p>
                
                <Badge className={cn("mb-8 font-bold uppercase tracking-widest px-3 py-1 text-[10px]", getStatusColor(selectedEmployee.status))}>
                  {selectedEmployee.status}
                </Badge>

                <div className="w-full space-y-3 pt-6 border-t border-neutral-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400 font-medium">Category</span>
                    <span className="text-neutral-900 font-bold capitalize">{selectedEmployee.category.replace('-', ' ')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400 font-medium">Joined</span>
                    <span className="text-neutral-900 font-bold">{format(new Date(selectedEmployee.createdAt || Date.now()), 'MMM yyyy')}</span>
                  </div>
                </div>
              </div>

              {/* Right Content Area */}
              <div className="flex-1 p-8 overflow-y-auto">
                <Tabs defaultValue="info" className="w-full h-full flex flex-col">
                  <TabsList className="justify-start h-auto p-0 bg-transparent gap-8 border-b border-neutral-100 rounded-none mb-8">
                    <TabsTrigger 
                      value="info" 
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-neutral-900 rounded-none px-0 py-4 text-xs font-bold uppercase tracking-widest transition-all"
                    >
                      Overview
                    </TabsTrigger>
                    <TabsTrigger 
                      value="payroll" 
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-neutral-900 rounded-none px-0 py-4 text-xs font-bold uppercase tracking-widest transition-all"
                    >
                      Payroll
                    </TabsTrigger>
                    <TabsTrigger 
                      value="deductions" 
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-neutral-900 rounded-none px-0 py-4 text-xs font-bold uppercase tracking-widest transition-all"
                    >
                      Deductions
                    </TabsTrigger>
                    <TabsTrigger 
                      value="schedules" 
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-neutral-900 rounded-none px-0 py-4 text-xs font-bold uppercase tracking-widest transition-all"
                    >
                      Schedules
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="mt-0 focus-visible:outline-none flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Bento Card: Contact Info */}
                      <div className="p-6 bg-white rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-blue-50 rounded-xl">
                            <Mail className="w-4 h-4 text-blue-600" />
                          </div>
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Contact Details</h4>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-semibold text-neutral-900 mb-0.5">{selectedEmployee.email}</p>
                            <p className="text-[10px] text-neutral-400 font-medium">Primary Work Email</p>
                          </div>
                          <div className="pt-2.5 border-t border-neutral-100">
                            <p className="text-sm font-semibold text-neutral-900 mb-0.5">{selectedEmployee.phoneNumber || '09171234567'}</p>
                            <p className="text-[10px] text-neutral-400 font-medium">SMS Notifications Phone</p>
                          </div>
                        </div>
                      </div>

                      {/* Bento Card: Salary */}
                      <div className="p-6 bg-white rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-emerald-50 rounded-xl">
                            <CreditCard className="w-4 h-4 text-emerald-600" />
                          </div>
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Compensation</h4>
                        </div>
                        <p className="text-xl font-bold text-emerald-600 mb-1">₱{formatCurrency(selectedEmployee.basicSalary)}</p>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                          {selectedEmployee.salaryType === 'semi-monthly' ? 'Semi-Monthly' : 'Monthly'} Rate
                        </p>
                      </div>

                      {/* Bento Card: Employment */}
                      <div className="p-6 bg-white rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow md:col-span-2">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-2 bg-purple-50 rounded-xl">
                            <Briefcase className="w-4 h-4 text-purple-600" />
                          </div>
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Employment Information</h4>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div>
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">Category</p>
                            <p className="text-sm font-semibold text-neutral-900 capitalize">{selectedEmployee.category?.replace('-', ' ')}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">Schedule</p>
                            <p className="text-sm font-semibold text-neutral-900">
                              {selectedEmployee.category === 'Visiting Instructor' ? 'Flexible (Workload)' : 'Standard Office Hours'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">Contract</p>
                            <p className="text-sm font-semibold text-neutral-900">
                              {selectedEmployee.category === 'Regular Employee' ? 'Permanent Regular' :
                               selectedEmployee.category === 'Job Order' ? 'Contract-Based' : 'Part-Time Workload'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">Configured Benefits</p>
                            <p className="text-sm font-semibold text-neutral-900">
                              {selectedEmployee.category === 'Regular Employee' ? 'Full Benefits (SSS, PH, PI)' :
                               selectedEmployee.category === 'Job Order' ? (
                                 [
                                   selectedEmployee.hasSss ? 'SSS' : null,
                                   selectedEmployee.hasPhilhealth ? 'PhilHealth' : null,
                                   selectedEmployee.hasPagibig ? 'Pag-IBIG' : null
                                 ].filter(Boolean).join(', ') || 'None'
                               ) : 'None'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Bento Card: SLSU Registry Information */}
                      <div className="p-6 bg-white rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow md:col-span-2">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-2 bg-rose-50 rounded-xl">
                            <User className="w-4 h-4 text-rose-600" />
                          </div>
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">SLSU Core Registry</h4>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div>
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">ID</p>
                            <p className="text-sm font-semibold text-neutral-900 font-mono">{selectedEmployee.bpno || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">Employee No.</p>
                            <p className="text-sm font-semibold text-neutral-900 font-mono">{selectedEmployee.employeeNo || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">Birth Date</p>
                            <p className="text-sm font-semibold text-neutral-900">
                              {selectedEmployee.birthDate ? format(new Date(selectedEmployee.birthDate), 'MMM dd, yyyy') : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">Effectivity Date</p>
                            <p className="text-sm font-semibold text-neutral-900">
                              {selectedEmployee.effectivityDate ? format(new Date(selectedEmployee.effectivityDate), 'MMM dd, yyyy') : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">Prefix</p>
                            <p className="text-sm font-semibold text-neutral-900">{selectedEmployee.prefix || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">Middle Initial</p>
                            <p className="text-sm font-semibold text-neutral-900">{selectedEmployee.mi || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">Appellation</p>
                            <p className="text-sm font-semibold text-neutral-900">{selectedEmployee.appellation || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">Gender</p>
                            <p className="text-sm font-semibold text-neutral-900">{selectedEmployee.gender || 'MALE'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">Form Code</p>
                            <p className="text-sm font-semibold text-neutral-900 font-mono">SLSU-F-REG-01</p>
                          </div>
                        </div>
                      </div>

                      {/* Bento Card: Status Note */}
                      <div className="p-6 bg-neutral-900 rounded-2xl border border-neutral-800 shadow-xl md:col-span-2 text-white">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-white/10 rounded-xl">
                            <Clock className="w-4 h-4 text-white" />
                          </div>
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">System Status</h4>
                        </div>
                        <p className="text-sm text-neutral-300 leading-relaxed">
                          This profile is currently <span className="text-white font-bold">{selectedEmployee.status}</span>. 
                          Last payroll activity was recorded on <span className="text-white font-bold">{format(new Date(), 'MMMM dd, yyyy')}</span>.
                          All recurring deductions are automatically applied during cycle generation.
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="payroll" className="mt-0 focus-visible:outline-none flex-1">
                    {historyLoading ? (
                      <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <div className="w-10 h-10 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
                        <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Synchronizing History...</p>
                      </div>
                    ) : payrollHistory.length === 0 ? (
                      <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-neutral-200">
                        <History className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                        <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">No Payroll Records</p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-auto custom-scrollbar max-h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-neutral-50/50 hover:bg-neutral-50/50 border-none">
                              <TableHead className="text-[10px] font-bold uppercase tracking-widest h-12">Cycle</TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-widest h-12">Net Pay</TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-widest h-12 text-right">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {payrollHistory.map((entry) => (
                              <TableRow key={entry.id} className="hover:bg-neutral-50/50 transition-colors border-neutral-50">
                                <TableCell className="py-4">
                                  <div className="font-bold text-neutral-900">{entry.cycleName}</div>
                                  <div className="text-[10px] text-neutral-400 font-medium">
                                    {format(new Date(entry.startDate), 'MMM dd')} - {format(new Date(entry.endDate), 'dd, yyyy')}
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 font-bold text-emerald-600">₱{formatCurrency(entry.netPay)}</TableCell>
                                <TableCell className="py-4 text-right">
                                  <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border-neutral-200">
                                    {entry.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="deductions" className="mt-0 focus-visible:outline-none flex-1">
                    {historyLoading ? (
                      <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <div className="w-10 h-10 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
                        <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Loading Deductions...</p>
                      </div>
                    ) : deductionHistory.length === 0 ? (
                      <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-neutral-200">
                        <CreditCard className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                        <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">No Active Deductions</p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-auto custom-scrollbar max-h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-neutral-50/50 hover:bg-neutral-50/50 border-none">
                              <TableHead className="text-[10px] font-bold uppercase tracking-widest h-12">Type</TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-widest h-12">Amount</TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-widest h-12 text-right">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {deductionHistory.map((d) => (
                              <TableRow key={d.id} className="hover:bg-neutral-50/50 transition-colors border-neutral-50">
                                <TableCell className="py-4">
                                  <div className="font-bold text-neutral-900">{d.description || d.type}</div>
                                  <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{d.type}</div>
                                </TableCell>
                                <TableCell className="py-4 font-bold text-red-600">-₱{formatCurrency(d.amount)}</TableCell>
                                <TableCell className="py-4 text-right">
                                  <Badge variant={d.status === 'active' ? 'default' : 'outline'} className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5">
                                    {d.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="schedules" className="mt-0 focus-visible:outline-none flex-1">
                    {historyLoading ? (
                      <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <div className="w-10 h-10 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
                        <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Loading Schedules...</p>
                      </div>
                    ) : employeeSchedules.length === 0 ? (
                      <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-neutral-200">
                        <Clock className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                        <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">
                          {selectedEmployee?.category === 'Regular Employee' ? 'No Work Schedules' : 'No Class Schedules'}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-auto custom-scrollbar max-h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-neutral-50/50 hover:bg-neutral-50/50 border-none">
                              <TableHead className="text-[10px] font-bold uppercase tracking-widest h-12">Day</TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-widest h-12">Time</TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-widest h-12">
                                {selectedEmployee?.category === 'Regular Employee' ? 'Regular Type' : 'Subject'}
                              </TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-widest h-12 text-right">Room</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[...employeeSchedules].sort((a, b) => {
                              const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                              const dayA = days.indexOf(a.dayOfWeek);
                              const dayB = days.indexOf(b.dayOfWeek);
                              if (dayA !== dayB) return dayA - dayB;
                              return a.startTime.localeCompare(b.startTime);
                            }).map((s) => (
                              <TableRow key={s.id} className="hover:bg-neutral-50/50 transition-colors border-neutral-50">
                                <TableCell className="py-4">
                                  <div className="flex flex-col gap-1">
                                    <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border-neutral-200 w-fit">
                                      {s.dayOfWeek}
                                    </Badge>
                                    {s.specificDate && (
                                      <span className="text-[10px] text-neutral-500 font-semibold italic">
                                        {(() => {
                                          const parts = s.specificDate.split('-');
                                          if (parts.length === 3) {
                                            const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                                            return dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                                          }
                                          return s.specificDate;
                                        })()}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="py-4">
                                  <div className="text-xs font-bold text-neutral-900">{formatTimeTo12Hour(s.startTime)} - {formatTimeTo12Hour(s.endTime)}</div>
                                </TableCell>
                                <TableCell className="py-4">
                                  <div className="font-bold text-neutral-900">{s.subject}</div>
                                </TableCell>
                                <TableCell className="py-4 text-right">
                                  <div className="text-xs text-neutral-500">{s.room || 'N/A'}</div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <DeleteConfirmationDialog 
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title={itemToDelete?.type === 'employee' ? "Delete Employee" : "Delete Category"}
        description={itemToDelete?.type === 'employee' 
          ? "Are you sure you want to delete this employee? This action cannot be undone." 
          : "Are you sure you want to delete this category? This will affect employee filtering."}
      />

      <DeleteConfirmationDialog 
        isOpen={isDeleteAllOpen}
        onOpenChange={setIsDeleteAllOpen}
        onConfirm={handleDeleteAllConfirm}
        isLoading={isDeletingAll}
        title="Delete All Employees"
        description="Are you sure you want to delete ALL employees from the system? This action is highly destructive, cannot be undone, and will clear all employee accounts, deductions, schedules, and DTR logs."
      />

      {/* Excel Import Preview Modal */}
      <Dialog open={isImportPreviewOpen} onOpenChange={setIsImportPreviewOpen}>
        <DialogContent className="sm:max-w-[750px] max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle className="text-xl font-bold text-neutral-900">Import Employees Preview</DialogTitle>
            <DialogDescription>
              Review the parsed employee list before committing the import. A total of {importData.length} records found.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-4 custom-scrollbar">
            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-neutral-50 sticky top-0">
                  <TableRow>
                    <TableHead className="font-bold text-xs">ID</TableHead>
                    <TableHead className="font-bold text-xs">Full Name</TableHead>
                    <TableHead className="font-bold text-xs">Position</TableHead>
                    <TableHead className="font-bold text-xs">CRN</TableHead>
                    <TableHead className="font-bold text-xs">Salary</TableHead>
                    <TableHead className="font-bold text-xs">Effectivity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importData.map((emp, idx) => (
                    <TableRow key={idx} className="hover:bg-neutral-50/50">
                      <TableCell className="font-mono text-xs">{emp.bpno || 'N/A'}</TableCell>
                      <TableCell className="font-semibold text-xs text-neutral-800">
                        {emp.prefix ? `${emp.prefix} ` : ''}
                        {emp.lastName}, {emp.firstName}
                        {emp.mi ? ` ${emp.mi}` : ''}
                        {emp.appellation ? ` ${emp.appellation}` : ''}
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-neutral-700">
                        {emp.position || (
                          <span className="text-neutral-400 italic">No Position</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{emp.crn || 'N/A'}</TableCell>
                      <TableCell className="font-medium text-xs text-emerald-600">₱{formatCurrency(emp.basicSalary)}</TableCell>
                      <TableCell className="text-xs">{emp.effectivityDate || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter className="p-6 pt-2 border-t border-neutral-100 bg-neutral-50 shrink-0">
            <Button variant="outline" onClick={() => setIsImportPreviewOpen(false)} disabled={importLoading}>
              Cancel
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleConfirmImport} disabled={importLoading}>
              {importLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Import ({importData.length} Employees)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;
