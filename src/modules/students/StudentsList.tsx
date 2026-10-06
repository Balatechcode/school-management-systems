/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  UserPlus,
  Eye,
  Edit2,
  Trash2,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Phone,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { api } from '../../lib/api.js';
import {
  StudentWithDetails,
  AcademicYear,
  SchoolClass,
  Section,
  PaginatedResponse,
} from '../../types/index.js';
import { Table, Column } from '../../components/common/Table.js';
import { Button } from '../../components/common/Button.js';
import { Input } from '../../components/common/Input.js';
import { Badge } from '../../components/common/Badge.js';
import { useToast } from '../../components/common/Toast.js';
import { AddStudentModal } from './AddStudentModal.js';
import { EditStudentModal } from './EditStudentModal.js';
import { StudentProfileView } from './StudentProfileView.js';

export const StudentsList: React.FC = () => {
  const { hasPermission, isAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [students, setStudents] = useState<StudentWithDetails[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  // Dropdown Metadata
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  // Navigation / Modal States
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<StudentWithDetails | null>(null);

  const canCreate = isAdmin || hasPermission('students.create');
  const canUpdate = isAdmin || hasPermission('students.update');
  const canDelete = isAdmin || hasPermission('students.delete');

  // Load Metadata
  useEffect(() => {
    async function loadMeta() {
      const [ayRes, clsRes, secRes] = await Promise.all([
        api.get<AcademicYear[]>('/api/academic-years'),
        api.get<SchoolClass[]>('/api/classes'),
        api.get<Section[]>('/api/sections'),
      ]);

      if (ayRes.success && ayRes.data) setAcademicYears(ayRes.data);
      if (clsRes.success && clsRes.data) setClasses(clsRes.data);
      if (secRes.success && secRes.data) setSections(secRes.data);
    }
    loadMeta();
  }, []);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(limit));
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (classFilter) params.set('classId', classFilter);
      if (sectionFilter) params.set('sectionId', sectionFilter);
      if (yearFilter) params.set('academicYearId', yearFilter);

      const res = await api.get<PaginatedResponse<StudentWithDetails>>(`/api/students?${params.toString()}`);

      if (res.success && res.data) {
        setStudents(res.data.data || []);
        setTotalCount(res.data.pagination.total);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (e: any) {
      toastError('Failed to load students directory');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [currentPage, limit, statusFilter, classFilter, sectionFilter, yearFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchStudents();
  };

  const handleArchiveStudent = async (id: string, name: string) => {
    if (!window.confirm(`Archive student ${name}? This will change status to INACTIVE.`)) return;
    try {
      const res = await api.delete(`/api/students/${id}`);
      if (res.success) {
        success('Student archived');
        fetchStudents();
      } else {
        toastError(res.message || 'Archival failed');
      }
    } catch (err: any) {
      toastError(err.message);
    }
  };

  // If a student is selected, display their detailed profile
  if (selectedStudentId) {
    return (
      <StudentProfileView
        studentId={selectedStudentId}
        onBack={() => {
          setSelectedStudentId(null);
          fetchStudents();
        }}
      />
    );
  }

  const columns: Column<StudentWithDetails>[] = [
    {
      key: 'photo',
      header: 'Photo',
      className: 'w-12',
      render: (s) => (
        s.photo_url ? (
          <img
            src={s.photo_url}
            alt={s.first_name}
            className="w-9 h-9 rounded-full object-cover border border-slate-200"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200">
            {s.first_name[0]}
          </div>
        )
      ),
    },
    {
      key: 'admission_number',
      header: 'Adm No',
      render: (s) => (
        <span className="font-mono text-xs font-semibold text-slate-800">
          {s.admission_number}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Student Name',
      render: (s) => (
        <div>
          <button
            onClick={() => setSelectedStudentId(s.id)}
            className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors text-left cursor-pointer"
          >
            {s.first_name} {s.last_name}
          </button>
          <div className="text-[11px] text-slate-400">
            {s.gender || '—'} • DOB: {s.date_of_birth || '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'placement',
      header: 'Class & Section',
      render: (s) => {
        const ce = s.current_enrollment;
        if (!ce) return <span className="text-slate-400 italic text-xs">Unassigned</span>;
        return (
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-800 text-xs">
              {ce.school_class?.name || 'Class'}
            </span>
            <span className="w-5 h-5 rounded bg-indigo-50 text-indigo-700 font-bold inline-flex items-center justify-center text-[10px]">
              {ce.section?.code || '—'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'roll_number',
      header: 'Roll No',
      render: (s) => (
        <span className="font-mono font-medium text-xs text-slate-700">
          #{s.current_enrollment?.roll_number || '—'}
        </span>
      ),
    },
    {
      key: 'parent',
      header: 'Guardian',
      render: (s) => {
        const p = s.parents?.[0];
        if (!p) return <span className="text-slate-400 italic text-xs">None listed</span>;
        return (
          <div className="text-xs">
            <div className="font-medium text-slate-800">
              {p.parent?.first_name} {p.parent?.last_name}
            </div>
            <div className="text-[10px] text-slate-400">{p.relationship}</div>
          </div>
        );
      },
    },
    {
      key: 'phone',
      header: 'Contact Phone',
      render: (s) => {
        const phone = s.phone || s.parents?.[0]?.parent?.phone;
        return <span className="text-xs font-mono text-slate-600">{phone || '—'}</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => (
        <Badge
          variant={s.status === 'ACTIVE' ? 'success' : s.status === 'LEFT' ? 'danger' : 'warning'}
          size="sm"
        >
          {s.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (s) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setSelectedStudentId(s.id)}
            title="View Student Dossier"
            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          {canUpdate && (
            <button
              onClick={() => setStudentToEdit(s)}
              title="Edit Student"
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => handleArchiveStudent(s.id, `${s.first_name} ${s.last_name}`)}
              title="Archive Student"
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            Student Management &amp; Enrollment
          </h2>
          <p className="text-xs text-slate-500">
            Admissions, classroom placements, guardian registries, and student academic history.
          </p>
        </div>

        {canCreate && (
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Enroll New Student
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by admission number, student name, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <Button type="submit" size="sm" variant="secondary">
            Search
          </Button>
        </form>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Enrollment Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="TRANSFERRED">TRANSFERRED</option>
              <option value="PASSED_OUT">PASSED_OUT</option>
              <option value="LEFT">LEFT</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Class Grade
            </label>
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Section
            </label>
            <select
              value={sectionFilter}
              onChange={(e) => {
                setSectionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700"
            >
              <option value="">All Sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Academic Session
            </label>
            <select
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700"
            >
              <option value="">All Academic Years</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.is_current ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={students}
        keyExtractor={(s) => s.id}
        isLoading={isLoading}
        emptyMessage="No students match the criteria."
      />

      {/* Pagination Controls */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between text-xs text-slate-600">
        <div>
          Showing {students.length} of {totalCount} students • Page {currentPage} of {totalPages}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onCreated={fetchStudents}
      />

      {/* Edit Student Modal */}
      <EditStudentModal
        isOpen={Boolean(studentToEdit)}
        student={studentToEdit}
        onClose={() => setStudentToEdit(null)}
        onUpdated={fetchStudents}
      />
    </div>
  );
};
