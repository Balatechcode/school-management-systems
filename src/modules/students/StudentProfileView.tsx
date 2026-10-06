/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Camera,
  Upload,
  FileText,
  User,
  Users,
  GraduationCap,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Trash2,
  Plus,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { api } from '../../lib/api.js';
import { StudentWithDetails, Parent } from '../../types/index.js';
import { Button } from '../../components/common/Button.js';
import { Badge } from '../../components/common/Badge.js';
import { Modal } from '../../components/common/Modal.js';
import { Input } from '../../components/common/Input.js';
import { Select } from '../../components/common/Select.js';
import { useToast } from '../../components/common/Toast.js';
import { EditStudentModal } from './EditStudentModal.js';
import { PromoteStudentModal } from './PromoteStudentModal.js';

interface StudentProfileViewProps {
  studentId: string;
  onBack: () => void;
}

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({ studentId, onBack }) => {
  const { hasPermission, isAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [student, setStudent] = useState<StudentWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'parents' | 'history' | 'documents'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Sub-modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
  const [isAddParentModalOpen, setIsAddParentModalOpen] = useState(false);

  // Upload States
  const [docType, setDocType] = useState('Birth Certificate');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Add Parent Form
  const [parentForm, setParentForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    occupation: '',
    relationship: 'Mother',
    is_primary: false,
    is_emergency: true,
    can_pickup: true,
  });
  const [isSavingParent, setIsSavingParent] = useState(false);

  const canEdit = isAdmin || hasPermission('students.update');
  const canUploadDoc = isAdmin || hasPermission('documents.create');
  const canDeleteDoc = isAdmin || hasPermission('documents.delete');
  const canEnroll = isAdmin || hasPermission('enrollment.create');

  const fetchStudent = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<StudentWithDetails>(`/api/students/${studentId}`);
      if (res.success && res.data) {
        setStudent(res.data);
      } else {
        toastError(res.message || 'Could not load student profile');
      }
    } catch (e: any) {
      toastError('Failed to fetch student record');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudent();
  }, [studentId]);

  // Photo Upload to Cloudinary
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const formData = new FormData();
    formData.append('photo', file);

    setIsUploadingPhoto(true);
    try {
      const token = localStorage.getItem('educore_auth_token');
      const response = await fetch(`/api/students/${studentId}/photo`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const res = await response.json();
      if (res.success) {
        success('Student photo updated via Cloudinary!');
        fetchStudent();
      } else {
        toastError(res.message || 'Photo upload failed');
      }
    } catch (err: any) {
      toastError(err.message || 'Upload failed');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Document Upload
  const handleDocUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) {
      toastError('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('document', docFile);
    formData.append('document_type', docType);

    setIsUploadingDoc(true);
    try {
      const token = localStorage.getItem('educore_auth_token');
      const response = await fetch(`/api/students/${studentId}/documents`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const res = await response.json();
      if (res.success) {
        success('Document uploaded to Cloudinary successfully!');
        setIsUploadDocModalOpen(false);
        setDocFile(null);
        fetchStudent();
      } else {
        toastError(res.message || 'Document upload failed');
      }
    } catch (err: any) {
      toastError(err.message || 'Upload error');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (documentId: string, docName: string) => {
    if (!window.confirm(`Delete ${docName} permanently?`)) return;
    try {
      const res = await api.delete(`/api/students/${studentId}/documents/${documentId}`);
      if (res.success) {
        success('Document removed');
        fetchStudent();
      } else {
        toastError(res.message || 'Delete error');
      }
    } catch (err: any) {
      toastError(err.message);
    }
  };

  // Add Parent & Link to Student
  const handleAddParentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingParent(true);
    try {
      // 1. Create parent
      const pRes = await api.post<Parent>('/api/parents', {
        first_name: parentForm.first_name,
        last_name: parentForm.last_name || student?.last_name,
        phone: parentForm.phone,
        email: parentForm.email,
        occupation: parentForm.occupation,
      });

      if (!pRes.success || !pRes.data) {
        throw new Error(pRes.message || 'Failed to create parent');
      }

      // 2. Link parent
      const linkRes = await api.post(`/api/students/${studentId}/parents`, {
        parent_id: pRes.data.id,
        relationship: parentForm.relationship,
        is_primary: parentForm.is_primary,
        is_emergency: parentForm.is_emergency,
        can_pickup: parentForm.can_pickup,
      });

      if (linkRes.success) {
        success('Guardian added & linked successfully!');
        setIsAddParentModalOpen(false);
        fetchStudent();
      } else {
        toastError(linkRes.message || 'Failed to link guardian');
      }
    } catch (err: any) {
      toastError(err.message);
    } finally {
      setIsSavingParent(false);
    }
  };

  const handleUnlinkParent = async (parentId: string, parentName: string) => {
    if (!window.confirm(`Unlink ${parentName} from student?`)) return;
    try {
      const res = await api.delete(`/api/students/${studentId}/parents/${parentId}`);
      if (res.success) {
        success('Guardian unlinked');
        fetchStudent();
      } else {
        toastError(res.message || 'Unlink failed');
      }
    } catch (err: any) {
      toastError(err.message);
    }
  };

  if (isLoading || !student) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading student dossier...</div>;
  }

  const currentEnr = student.current_enrollment;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Students Directory</span>
        </button>
      </div>

      {/* Student Banner Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Photo & Cloudinary Uploader */}
          <div className="relative group">
            {student.photo_url ? (
              <img
                src={student.photo_url}
                alt={student.first_name}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-indigo-200 shadow-sm"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-indigo-100 text-indigo-700 font-bold text-3xl flex items-center justify-center border-2 border-indigo-200">
                {student.first_name[0]}
              </div>
            )}

            {canEdit && (
              <label
                className="absolute inset-0 bg-slate-900/60 rounded-2xl flex flex-col items-center justify-center text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Upload photo to Cloudinary"
              >
                <Camera className="w-5 h-5 mb-1" />
                <span>{isUploadingPhoto ? 'Uploading...' : 'Change Photo'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="hidden"
                  disabled={isUploadingPhoto}
                />
              </label>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900">
                {student.first_name} {student.middle_name ? `${student.middle_name} ` : ''}{student.last_name}
              </h2>
              <Badge
                variant={student.status === 'ACTIVE' ? 'success' : student.status === 'LEFT' ? 'danger' : 'warning'}
              >
                {student.status}
              </Badge>
            </div>

            <div className="mt-1 flex items-center gap-4 text-xs text-slate-500 font-mono">
              <span>Adm No: <strong className="text-slate-800">{student.admission_number}</strong></span>
              <span>•</span>
              <span>Gender: <strong className="text-slate-800">{student.gender || '—'}</strong></span>
              <span>•</span>
              <span>DOB: <strong className="text-slate-800">{student.date_of_birth || '—'}</strong></span>
            </div>

            {/* Placement pill */}
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 font-medium">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <span>
                {currentEnr?.school_class?.name || 'Class Unassigned'} - {currentEnr?.section?.code || '—'}
              </span>
              <span className="text-slate-400">|</span>
              <span>Roll No: {currentEnr?.roll_number || '—'}</span>
              <span className="text-slate-400">|</span>
              <span className="text-indigo-600">{currentEnr?.academic_year?.name || 'Current Session'}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          {canEnroll && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPromoteModalOpen(true)}
              leftIcon={<GraduationCap className="w-4 h-4 text-indigo-600" />}
            >
              Promote Student
            </Button>
          )}

          {canEdit && (
            <Button
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              leftIcon={<User className="w-4 h-4" />}
            >
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Profile Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        {[
          { id: 'overview', label: 'Overview', icon: User },
          { id: 'parents', label: `Parents & Guardians (${student.parents?.length || 0})`, icon: Users },
          { id: 'history', label: `Academic History (${student.enrollments?.length || 0})`, icon: GraduationCap },
          { id: 'documents', label: `Documents (${student.documents?.length || 0})`, icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-100 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              Personal Demographics
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Full Name</span>
                <span className="font-medium text-slate-900">{student.first_name} {student.last_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Gender</span>
                <span className="font-medium text-slate-900">{student.gender || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Date of Birth</span>
                <span className="font-medium text-slate-900">{student.date_of_birth || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Blood Group</span>
                <span className="font-medium text-slate-900">{student.blood_group || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Nationality</span>
                <span className="font-medium text-slate-900">{student.nationality || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Social Category</span>
                <span className="font-medium text-slate-900">{student.category || 'General'}</span>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Contact &amp; Location
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Phone Number</span>
                <span className="font-medium text-slate-900">{student.phone || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Email Address</span>
                <span className="font-medium text-slate-900">{student.email || '—'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block mb-0.5">Street Address</span>
                <span className="font-medium text-slate-900">{student.address || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">City &amp; State</span>
                <span className="font-medium text-slate-900">
                  {student.city ? `${student.city}, ${student.state}` : '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Postal / Pincode</span>
                <span className="font-medium text-slate-900">{student.pincode || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PARENTS & GUARDIANS */}
      {activeTab === 'parents' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900">Parents &amp; Guardians</h3>
            {canEdit && (
              <Button
                size="sm"
                onClick={() => setIsAddParentModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Guardian
              </Button>
            )}
          </div>

          {student.parents && student.parents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {student.parents.map((p) => (
                <div key={p.parent_id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm text-slate-900">
                          {p.parent?.first_name} {p.parent?.last_name}
                        </strong>
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {p.relationship}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {p.parent?.occupation || 'Guardian'}
                      </p>
                    </div>

                    {canEdit && (
                      <button
                        onClick={() => handleUnlinkParent(p.parent_id, `${p.parent?.first_name} ${p.parent?.last_name}`)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="Unlink Guardian"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{p.parent?.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{p.parent?.email || '—'}</span>
                    </div>
                  </div>

                  {/* Badges: Primary, Emergency, Pickup */}
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                    {p.is_primary && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        ✓ Primary Contact
                      </span>
                    )}
                    {p.is_emergency && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        ✓ Emergency Contact
                      </span>
                    )}
                    {p.can_pickup && (
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        ✓ Authorized Pickup
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
              No parent or guardian linked to this student yet.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACADEMIC HISTORY TIMELINE */}
      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Academic Progression Timeline</h3>
              <p className="text-xs text-slate-500">
                Preserved placement records per academic year. Old enrollments are never overwritten upon promotion.
              </p>
            </div>
            {canEnroll && (
              <Button size="sm" onClick={() => setIsPromoteModalOpen(true)}>
                Promote / Transfer
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/70">
                  <th className="py-2.5 px-3">Academic Session</th>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3">Section</th>
                  <th className="py-2.5 px-3">Roll Number</th>
                  <th className="py-2.5 px-3">Placement Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Promotion Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {student.enrollments && student.enrollments.length > 0 ? (
                  student.enrollments.map((enr) => (
                    <tr key={enr.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {enr.academic_year?.name}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800">
                        {enr.school_class?.name}
                      </td>
                      <td className="py-3 px-3">
                        <span className="w-6 h-6 rounded bg-indigo-50 text-indigo-700 font-bold inline-flex items-center justify-center text-xs">
                          {enr.section?.code}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-slate-700">
                        #{enr.roll_number}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">
                        {enr.enrollment_date}
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={enr.status === 'ACTIVE' ? 'success' : enr.status === 'PROMOTED' ? 'primary' : 'neutral'}
                          size="sm"
                        >
                          {enr.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-slate-600 italic">
                        {enr.promotion_status || '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No historical enrollment placements found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Digital Documents &amp; Certificates</h3>
              <p className="text-xs text-slate-500">
                Cloudinary backed storage for student identification and transcripts.
              </p>
            </div>
            {canUploadDoc && (
              <Button
                size="sm"
                onClick={() => setIsUploadDocModalOpen(true)}
                leftIcon={<Upload className="w-4 h-4" />}
              >
                Upload Document
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/70">
                  <th className="py-2.5 px-3">Document Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Uploaded Date</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {student.documents && student.documents.length > 0 ? (
                  student.documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-medium text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span>{doc.document_name}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[10px]">
                          {doc.document_type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded"
                            title="Preview / Open Asset"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          {canDeleteDoc && (
                            <button
                              onClick={() => handleDeleteDocument(doc.id, doc.document_name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                              title="Delete Document"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No documents uploaded yet for this student.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      <EditStudentModal
        isOpen={isEditModalOpen}
        student={student}
        onClose={() => setIsEditModalOpen(false)}
        onUpdated={fetchStudent}
      />

      {/* Promote Student Modal */}
      <PromoteStudentModal
        isOpen={isPromoteModalOpen}
        student={student}
        onClose={() => setIsPromoteModalOpen(false)}
        onPromoted={fetchStudent}
      />

      {/* Upload Document Modal */}
      <Modal
        isOpen={isUploadDocModalOpen}
        onClose={() => setIsUploadDocModalOpen(false)}
        title="Upload Student Document"
        description="Select a document file to securely upload to Cloudinary storage."
      >
        <form onSubmit={handleDocUpload} className="space-y-4">
          <Select
            label="Document Type"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            options={[
              { value: 'Birth Certificate', label: 'Birth Certificate' },
              { value: 'Aadhaar / National ID', label: 'Aadhaar / National ID' },
              { value: 'Transfer Certificate', label: 'Transfer Certificate (TC)' },
              { value: 'Previous Marksheet', label: 'Previous Marksheet' },
              { value: 'Medical Certificate', label: 'Medical Certificate' },
              { value: 'Address Proof', label: 'Address Proof' },
              { value: 'Passport Photo', label: 'Passport Photo' },
              { value: 'Other Document', label: 'Other Document' },
            ]}
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Select File
            </label>
            <input
              type="file"
              required
              onChange={(e) => setDocFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsUploadDocModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isUploadingDoc}>
              Upload to Cloudinary
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Parent Modal */}
      <Modal
        isOpen={isAddParentModalOpen}
        onClose={() => setIsAddParentModalOpen(false)}
        title="Add &amp; Link Guardian"
        description="Register a parent/guardian and associate them with this student."
      >
        <form onSubmit={handleAddParentSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              required
              value={parentForm.first_name}
              onChange={(e) => setParentForm({ ...parentForm, first_name: e.target.value })}
            />
            <Input
              label="Last Name"
              value={parentForm.last_name}
              placeholder="Defaults to student surname"
              onChange={(e) => setParentForm({ ...parentForm, last_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              required
              type="tel"
              value={parentForm.phone}
              onChange={(e) => setParentForm({ ...parentForm, phone: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={parentForm.email}
              onChange={(e) => setParentForm({ ...parentForm, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Occupation"
              placeholder="e.g. Attorney"
              value={parentForm.occupation}
              onChange={(e) => setParentForm({ ...parentForm, occupation: e.target.value })}
            />
            <Select
              label="Relationship"
              value={parentForm.relationship}
              onChange={(e) => setParentForm({ ...parentForm, relationship: e.target.value })}
              options={[
                { value: 'Father', label: 'Father' },
                { value: 'Mother', label: 'Mother' },
                { value: 'Guardian', label: 'Legal Guardian' },
                { value: 'Foster Parent', label: 'Foster Parent' },
              ]}
            />
          </div>

          <div className="space-y-1.5 pt-1 text-xs text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={parentForm.is_primary}
                onChange={(e) => setParentForm({ ...parentForm, is_primary: e.target.checked })}
                className="rounded text-indigo-600"
              />
              <span>Designate as Primary Contact</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={parentForm.is_emergency}
                onChange={(e) => setParentForm({ ...parentForm, is_emergency: e.target.checked })}
                className="rounded text-indigo-600"
              />
              <span>Designate as Emergency Contact</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={parentForm.can_pickup}
                onChange={(e) => setParentForm({ ...parentForm, can_pickup: e.target.checked })}
                className="rounded text-indigo-600"
              />
              <span>Authorized for Campus Pickup</span>
            </label>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddParentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSavingParent}>
              Link Guardian
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
