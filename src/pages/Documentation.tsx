import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { Card } from '../components/ui/card';
import { FileText, GitBranch, Shield, Zap } from 'lucide-react';

mermaid.initialize({
  startOnLoad: true,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif',
});

const Mermaid = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      mermaid.contentLoaded();
    }
  }, [chart]);

  return (
    <div className="mermaid flex justify-center bg-white p-8 rounded-2xl border border-neutral-100 shadow-sm overflow-x-auto" ref={ref}>
      {chart}
    </div>
  );
};

const Documentation = () => {
  const payrollChart = `
    graph TD
      A[Start Payroll Cycle] --> B{Cycle Type?}
      B -- Monthly --> C[Basic Salary / 1]
      B -- Semi-Monthly --> D[Basic Salary / 2]
      C --> E[Process Attendance]
      D --> E
      E --> F[Calculate Deductions]
      F --> G[Generate Gross Pay]
      G --> H[Finalize Net Pay]
      H --> I[Disbursement]
      I --> J[Release Payslips]
  `;

  const dtrChart = `
    graph LR
      A[Employee Login] --> B[Check Status]
      B --> C{Current Status?}
      C -- Out/Empty --> D[Clock In]
      C -- In --> E[Clock Out]
      D --> F[Log Entry Created]
      E --> G[Log Entry Updated]
      F --> H[Attendance History]
      G --> H
  `;

  return (
    <div className="space-y-10 pb-20">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-neutral-900 mb-2">System Documentation</h1>
        <p className="text-neutral-500 text-lg">Understanding the logic and flow of the SLSU Payroll System.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-white border-neutral-100 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <Zap className="w-8 h-8 text-amber-500 mb-4" />
          <h3 className="font-bold text-lg mb-2">Automated Calculations</h3>
          <p className="text-sm text-neutral-500">Gross and net pay are automatically computed based on salary category and semi-monthly divisions.</p>
        </Card>
        <Card className="p-6 bg-white border-neutral-100 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <FileText className="w-8 h-8 text-blue-500 mb-4" />
          <h3 className="font-bold text-lg mb-2">Dynamic Payslips</h3>
          <p className="text-sm text-neutral-500">Real-time PDF generation for payslips, including breakdown of earnings and statutory deductions.</p>
        </Card>
        <Card className="p-6 bg-white border-neutral-100 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <Shield className="w-8 h-8 text-emerald-500 mb-4" />
          <h3 className="font-bold text-lg mb-2">Role-Based Access</h3>
          <p className="text-sm text-neutral-500">Strict security boundaries between Admins, Payroll Officers, and regular Employees.</p>
        </Card>
      </div>

      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <GitBranch className="w-6 h-6 text-neutral-900" />
          <h2 className="text-2xl font-bold text-neutral-900">Payroll Processing Pipeline</h2>
        </div>
        <Mermaid chart={payrollChart} />
        <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200">
          <h4 className="font-bold mb-2">Key Pipeline Stages:</h4>
          <ul className="list-disc list-inside space-y-2 text-sm text-neutral-600">
            <li><strong>Cycle Initiation:</strong> Define period (e.g., April 1-15) and cycle type.</li>
            <li><strong>Calculation Engine:</strong> Basic salary is halved for semi-monthly cycles.</li>
            <li><strong>Deduction Matrix:</strong> Fixed and variable deductions (SSS, PhilHealth, Pag-IBIG) are applied.</li>
            <li><strong>Validation:</strong> Admin reviews the processed list before disbursement.</li>
          </ul>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-neutral-900" />
          <h2 className="text-2xl font-bold text-neutral-900">Attendance (DTR) Workflow</h2>
        </div>
        <Mermaid chart={dtrChart} />
        <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200">
          <h4 className="font-bold mb-2">DTR Business Rules:</h4>
          <p className="text-sm text-neutral-600 mb-4">The Daily Time Record (DTR) system ensures accurate tracking of hours rendered.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-xl border border-neutral-100">
              <h5 className="font-bold text-xs uppercase tracking-wider text-neutral-400 mb-1">Clock-In</h5>
              <p className="text-sm">Captures precise timestamp and associates it with the current date.</p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-neutral-100">
              <h5 className="font-bold text-xs uppercase tracking-wider text-neutral-400 mb-1">Clock-Out</h5>
              <p className="text-sm">Updates the existing log for the day or creates a completion entry.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Documentation;
