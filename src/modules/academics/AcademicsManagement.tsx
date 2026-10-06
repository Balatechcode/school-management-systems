/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calendar, Layers, Hash, Plus, CheckCircle2, Archive, Trash2, Edit2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { api } from '../../lib/api.js';
import { AcademicYear, SchoolClass, Section } from '../../types/index.js';
import { Table, Column } from '../../components/common/Table.js';
import { Button } from '../../components/common/Button.js';
import { Input } from '../../components/common/Input.js';
import { Select } from '../../components/common/Select.js';
import { Badge } from '../../components/common/Badge.js';
import { Modal } from '../../components/common/Modal.js';
import { useToast } from '../../components/common/Toast.js';

export const AcademicsManagement: React.FC = () => {
  const { hasPermission, isAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [activeSubTab, setActiveSubTab] = useState<'years' | 'classes' | 'sections'>('years');
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [yearForm, setYearForm] = useState({
    name: '',
    start_date: '',
    end_date: '',
    is_current: false,
    status: 'ACTIVE' as 'ACTIVE' | 'ARCHIVED' | 'UPCOMING',
  });

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [classForm, setClassForm] = useState({
    name: '',
    code: '',
    display_order: 1,
  });

  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [sectionForm, setSectionForm] = useState({
    name: '',
    code: '',
    capacity: 40,
  });

  const [isSaving, setIsSaving] = useState(false);

  const canManageYears = isAdmin || hasPermission('academic_years.create');
  const canManageClasses = isAdmin || hasPermission('classes.create');
  const canManageSections = isAdmin || hasPermission('sections.create');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [ayRes, clsRes, secRes] = await Promise.all([
        api.get<AcademicYear[]>('/api/academic-years'),
        api.get<SchoolClass[]>('/api/classes'),
        api.get<Section[]>('/api/sections'),
      ]);

      if (ayRes.success && ayRes.data) setAcademicYears(ayRes.data);
      if (clsRes.success && clsRes.data) setClasses(clsRes.data);
      if (secRes.success && secRes.data) setSections(secRes.data);
    } catch (e: any) {
      toastError('Failed to load academic structure data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Academic Year Handlers
  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.post('/api/academic-years', yearForm);
      if (res.success) {
        success(`Academic Year ${yearForm.name} created!`);
        setIsYearModalOpen(false);
        fetchData();
      } else {
        toastError(res.message || 'Creation failed');
      }
    } catch (err: any) {
      toastError(err.message || 'Network error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetCurrentYear = async (year: AcademicYear) => {
    try {
      const res = await api.put(`/api/academic-years/${year.id}`, { is_current: true, status: 'ACTIVE' });
      if (res.success) {
        success(`${year.name} marked as the active current academic year!`);
        fetchData();
      } else {
        toastError(res.message || 'Update failed');
      }
    } catch (err: any) {
      toastError(err.message);
    }
  };

  // Class Handlers
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.post('/api/classes', {
        ...classForm,
        display_order: Number(classForm.display_order),
      });
      if (res.success) {
        success(`Class ${classForm.name} created!`);
        setIsClassModalOpen(false);
        fetchData();
      } else {
        toastError(res.message || 'Creation failed');
      }
    } catch (err: any) {
      toastError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClass = async (id: string, name: string) => {
    if (!window.confirm(`Delete ${name}? Only allowed if no historical student enrollments exist.`)) return;
    try {
      const res = await api.delete(`/api/classes/${id}`);
      if (res.success) {
        success('Class deleted successfully');
        fetchData();
      } else {
        toastError(res.message || 'Deletion failed');
      }
    } catch (err: any) {
      toastError(err.message);
    }
  };

  // Section Handlers
  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.post('/api/sections', {
        ...sectionForm,
        capacity: Number(sectionForm.capacity),
      });
      if (res.success) {
        success(`Section ${sectionForm.code} created!`);
        setIsSectionModalOpen(false);
        fetchData();
      } else {
        toastError(res.message || 'Creation failed');
      }
    } catch (err: any) {
      toastError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSection = async (id: string, code: string) => {
    if (!window.confirm(`Delete Section ${code}? Only allowed if no active student enrollments exist.`)) return;
    try {
      const res = await api.delete(`/api/sections/${id}`);
      if (res.success) {
        success('Section deleted successfully');
        fetchData();
      } else {
        toastError(res.message || 'Deletion failed');
      }
    } catch (err: any) {
      toastError(err.message);
    }
  };

  // Columns for Academic Years
  const yearColumns: Column<AcademicYear>[] = [
    {
      key: 'name',
      header: 'Session Name',
      render: (ay) => (
        <div className="flex items-center gap-2">
          <strong className="text-slate-900 font-semibold">{ay.name}</strong>
          {ay.is_current && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              CURRENT ACTIVE SESSION
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'dates',
      header: 'Date Span',
      render: (ay) => (
        <span className="text-xs font-mono text-slate-600">
          {ay.start_date} → {ay.end_date}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (ay) => (
        <Badge
          variant={ay.status === 'ACTIVE' ? 'success' : ay.status === 'ARCHIVED' ? 'neutral' : 'warning'}
          size="sm"
        >
          {ay.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (ay) => (
        <div className="flex items-center justify-end gap-2">
          {!ay.is_current && canManageYears && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs py-1"
              onClick={() => handleSetCurrentYear(ay)}
            >
              Set Current
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Columns for Classes
  const classColumns: Column<SchoolClass>[] = [
    {
      key: 'display_order',
      header: 'Order',
      render: (c) => <span className="font-mono text-xs font-semibold text-slate-500">#{c.display_order}</span>,
    },
    {
      key: 'name',
      header: 'Grade / Class Name',
      render: (c) => <strong className="text-slate-900">{c.name}</strong>,
    },
    {
      key: 'code',
      header: 'Code',
      render: (c) => <span className="font-mono text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{c.code}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (c) => (
        canManageClasses && (
          <button
            onClick={() => handleDeleteClass(c.id, c.name)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            title="Delete Class"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )
      ),
    },
  ];

  // Columns for Sections
  const sectionColumns: Column<Section>[] = [
    {
      key: 'code',
      header: 'Section Code',
      render: (s) => (
        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center border border-indigo-200 text-sm">
          {s.code}
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Section Name',
      render: (s) => <strong className="text-slate-900">{s.name}</strong>,
    },
    {
      key: 'capacity',
      header: 'Max Student Capacity',
      render: (s) => <span className="text-slate-700 font-medium">{s.capacity} Students</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (s) => (
        canManageSections && (
          <button
            onClick={() => handleDeleteSection(s.id, s.code)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            title="Delete Section"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Academic Structure</h2>
          <p className="text-xs text-slate-500">
            Configure institutional academic sessions, grade levels, and sections for the school.
          </p>
        </div>

        {/* Action Button for Active Sub-Tab */}
        <div>
          {activeSubTab === 'years' && canManageYears && (
            <Button
              size="sm"
              onClick={() => {
                setYearForm({
                  name: '',
                  start_date: '2027-08-15',
                  end_date: '2028-06-15',
                  is_current: false,
                  status: 'UPCOMING',
                });
                setIsYearModalOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Academic Year
            </Button>
          )}

          {activeSubTab === 'classes' && canManageClasses && (
            <Button
              size="sm"
              onClick={() => {
                setClassForm({
                  name: '',
                  code: '',
                  display_order: classes.length + 1,
                });
                setIsClassModalOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Class
            </Button>
          )}

          {activeSubTab === 'sections' && canManageSections && (
            <Button
              size="sm"
              onClick={() => {
                setSectionForm({
                  name: `Section ${String.fromCharCode(65 + sections.length)}`,
                  code: String.fromCharCode(65 + sections.length),
                  capacity: 40,
                });
                setIsSectionModalOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Section
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveSubTab('years')}
          className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'years'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Academic Sessions ({academicYears.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('classes')}
          className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'classes'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Classes &amp; Grades ({classes.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sections')}
          className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'sections'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Hash className="w-4 h-4" />
          <span>Sections ({sections.length})</span>
        </button>
      </div>

      {/* Tables Content */}
      {activeSubTab === 'years' && (
        <Table
          columns={yearColumns}
          data={academicYears}
          keyExtractor={(ay) => ay.id}
          isLoading={isLoading}
        />
      )}

      {activeSubTab === 'classes' && (
        <Table
          columns={classColumns}
          data={classes}
          keyExtractor={(c) => c.id}
          isLoading={isLoading}
        />
      )}

      {activeSubTab === 'sections' && (
        <Table
          columns={sectionColumns}
          data={sections}
          keyExtractor={(s) => s.id}
          isLoading={isLoading}
        />
      )}

      {/* Create Year Modal */}
      <Modal
        isOpen={isYearModalOpen}
        onClose={() => setIsYearModalOpen(false)}
        title="Add Academic Year Session"
        description="Configure start and end dates for a new school year session."
      >
        <form onSubmit={handleCreateYear} className="space-y-4">
          <Input
            label="Academic Year Name"
            placeholder="e.g. 2027-28"
            value={yearForm.name}
            onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={yearForm.start_date}
              onChange={(e) => setYearForm({ ...yearForm, start_date: e.target.value })}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={yearForm.end_date}
              onChange={(e) => setYearForm({ ...yearForm, end_date: e.target.value })}
              required
            />
          </div>
          <Select
            label="Initial Status"
            value={yearForm.status}
            onChange={(e) => setYearForm({ ...yearForm, status: e.target.value as any })}
            options={[
              { value: 'UPCOMING', label: 'UPCOMING' },
              { value: 'ACTIVE', label: 'ACTIVE' },
              { value: 'ARCHIVED', label: 'ARCHIVED' },
            ]}
          />
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="set_as_current"
              checked={yearForm.is_current}
              onChange={(e) => setYearForm({ ...yearForm, is_current: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="set_as_current" className="text-xs text-slate-700 font-medium">
              Set as Current Active Academic Year immediately
            </label>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsYearModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Save Session
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Class Modal */}
      <Modal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        title="Add Class / Grade Level"
        description="Add a new class to the academic grading hierarchy."
      >
        <form onSubmit={handleCreateClass} className="space-y-4">
          <Input
            label="Class Name"
            placeholder="e.g. Class 10"
            value={classForm.name}
            onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Code / Short Name"
              placeholder="e.g. CLS-10"
              value={classForm.code}
              onChange={(e) => setClassForm({ ...classForm, code: e.target.value })}
              required
            />
            <Input
              label="Display Order (Sequence)"
              type="number"
              value={classForm.display_order}
              onChange={(e) => setClassForm({ ...classForm, display_order: parseInt(e.target.value) || 1 })}
              required
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsClassModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Save Class
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Section Modal */}
      <Modal
        isOpen={isSectionModalOpen}
        onClose={() => setIsSectionModalOpen(false)}
        title="Add Classroom Section"
        description="Define a section and its maximum classroom capacity."
      >
        <form onSubmit={handleCreateSection} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Section Name"
              placeholder="e.g. Section A"
              value={sectionForm.name}
              onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
              required
            />
            <Input
              label="Section Code"
              placeholder="e.g. A"
              value={sectionForm.code}
              onChange={(e) => setSectionForm({ ...sectionForm, code: e.target.value })}
              required
            />
          </div>
          <Input
            label="Max Student Capacity"
            type="number"
            min={1}
            value={sectionForm.capacity}
            onChange={(e) => setSectionForm({ ...sectionForm, capacity: parseInt(e.target.value) || 40 })}
            required
          />
          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsSectionModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Save Section
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
