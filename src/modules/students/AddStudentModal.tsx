/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal.js';
import { Button } from '../../components/common/Button.js';
import { Input } from '../../components/common/Input.js';
import { Select } from '../../components/common/Select.js';
import { api } from '../../lib/api.js';
import { AcademicYear, SchoolClass, Section } from '../../types/index.js';
import { useToast } from '../../components/common/Toast.js';
import { User, Phone, GraduationCap, Users, Sparkles } from 'lucide-react';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { success, error: toastError } = useToast();

  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Section 1: Personal Information
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: 'Male',
    date_of_birth: '2014-06-15',
    blood_group: 'O+',
    nationality: 'American',
    category: 'General',

    // Section 2: Contact Information
    phone: '',
    email: '',
    address: '',
    city: 'Springfield',
    state: 'Oregon',
    pincode: '97477',

    // Section 3: Admission & Enrollment
    admission_number: '',
    admission_date: new Date().toISOString().split('T')[0],
    academic_year_id: '',
    class_id: '',
    section_id: '',
    roll_number: '1',

    // Section 4: Parent / Guardian
    parent_first_name: '',
    parent_last_name: '',
    parent_phone: '',
    parent_email: '',
    parent_occupation: '',
    parent_relationship: 'Father',
  });

  useEffect(() => {
    if (!isOpen) return;

    async function loadMeta() {
      const [ayRes, clsRes, secRes] = await Promise.all([
        api.get<AcademicYear[]>('/api/academic-years'),
        api.get<SchoolClass[]>('/api/classes'),
        api.get<Section[]>('/api/sections'),
      ]);

      if (ayRes.success && ayRes.data) {
        setAcademicYears(ayRes.data);
        const currentYear = ayRes.data.find((ay) => ay.is_current) || ayRes.data[0];
        if (currentYear) {
          setFormData((prev) => ({ ...prev, academic_year_id: currentYear.id }));
        }
      }
      if (clsRes.success && clsRes.data && clsRes.data.length > 0) {
        setClasses(clsRes.data);
        setFormData((prev) => ({ ...prev, class_id: clsRes.data![0].id }));
      }
      if (secRes.success && secRes.data && secRes.data.length > 0) {
        setSections(secRes.data);
        setFormData((prev) => ({ ...prev, section_id: secRes.data![0].id }));
      }
    }

    loadMeta();
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeStep < 4) {
      setActiveStep((prev) => (prev + 1) as any);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        student: {
          admission_number: formData.admission_number.trim() || undefined,
          first_name: formData.first_name.trim(),
          middle_name: formData.middle_name.trim() || null,
          last_name: formData.last_name.trim(),
          gender: formData.gender,
          date_of_birth: formData.date_of_birth,
          blood_group: formData.blood_group,
          nationality: formData.nationality,
          category: formData.category,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
          city: formData.city.trim() || null,
          state: formData.state.trim() || null,
          pincode: formData.pincode.trim() || null,
          admission_date: formData.admission_date,
          status: 'ACTIVE',
        },
        enrollment: formData.academic_year_id
          ? {
              academic_year_id: formData.academic_year_id,
              class_id: formData.class_id,
              section_id: formData.section_id,
              roll_number: formData.roll_number.trim() || '1',
            }
          : undefined,
        parent: formData.parent_first_name
          ? {
              first_name: formData.parent_first_name.trim(),
              last_name: formData.parent_last_name.trim() || formData.last_name.trim(),
              phone: formData.parent_phone.trim(),
              email: formData.parent_email.trim() || null,
              occupation: formData.parent_occupation.trim() || null,
              relationship: formData.parent_relationship,
            }
          : undefined,
      };

      const res = await api.post('/api/students', payload);

      if (res.success) {
        success('Student admitted & enrolled successfully!');
        onCreated();
        onClose();
      } else {
        toastError(res.message || 'Failed to enroll student');
      }
    } catch (err: any) {
      toastError(err.message || 'Submission error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enroll New Student"
      description="Multi-section institutional registration for students, placement, and guardians."
      maxWidth="2xl"
    >
      {/* Step Indicator Header */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {[
          { step: 1, label: 'Personal', icon: User },
          { step: 2, label: 'Contact', icon: Phone },
          { step: 3, label: 'Enrollment', icon: GraduationCap },
          { step: 4, label: 'Guardian', icon: Users },
        ].map((s) => {
          const Icon = s.icon;
          const isActive = activeStep === s.step;
          const isDone = activeStep > s.step;

          return (
            <button
              key={s.step}
              type="button"
              onClick={() => setActiveStep(s.step as any)}
              className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                isActive
                  ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-semibold'
                  : isDone
                  ? 'border-emerald-300 bg-emerald-50/50 text-emerald-900'
                  : 'border-slate-200 text-slate-400 bg-white'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs">
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : isDone ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{s.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* SECTION 1: Personal Information */}
        {activeStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-1 border-b border-slate-100">
              Section 1: Student Demographics
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="First Name"
                required
                placeholder="e.g. Liam"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
              <Input
                label="Middle Name (Optional)"
                placeholder="e.g. Alexander"
                value={formData.middle_name}
                onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
              />
              <Input
                label="Last Name"
                required
                placeholder="e.g. Wilson"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                options={[
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                  { value: 'Other', label: 'Other' },
                ]}
              />
              <Input
                label="Date of Birth"
                type="date"
                required
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
              <Select
                label="Blood Group"
                value={formData.blood_group}
                onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                options={[
                  { value: 'A+', label: 'A+' },
                  { value: 'A-', label: 'A-' },
                  { value: 'B+', label: 'B+' },
                  { value: 'B-', label: 'B-' },
                  { value: 'AB+', label: 'AB+' },
                  { value: 'AB-', label: 'AB-' },
                  { value: 'O+', label: 'O+' },
                  { value: 'O-', label: 'O-' },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nationality"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
              />
              <Input
                label="Social Category"
                placeholder="General, Scholarship, etc."
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* SECTION 2: Contact Information */}
        {activeStep === 2 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-1 border-b border-slate-100">
              Section 2: Contact &amp; Residential Address
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Student Phone (Optional)"
                type="tel"
                placeholder="+1 555-..."
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <Input
                label="Student Email (Optional)"
                type="email"
                placeholder="student@greenwood.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <Input
              label="Street Address"
              placeholder="e.g. 104 Willow Park Ave"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
              <Input
                label="State"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
              <Input
                label="Pincode / Postal Code"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* SECTION 3: Admission & Enrollment */}
        {activeStep === 3 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-1 border-b border-slate-100 flex items-center justify-between">
              <span>Section 3: Admission &amp; Classroom Placement</span>
              <span className="text-[10px] text-indigo-600 font-mono">Roll-number unique per section</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Admission Number"
                placeholder="Leave blank to auto-generate ADM-2026-XXXX"
                value={formData.admission_number}
                onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })}
                helperText="Server creates ADM-2026-XXXX if empty"
              />
              <Input
                label="Admission Date"
                type="date"
                required
                value={formData.admission_date}
                onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Academic Session"
                value={formData.academic_year_id}
                onChange={(e) => setFormData({ ...formData, academic_year_id: e.target.value })}
                options={academicYears.map((ay) => ({
                  value: ay.id,
                  label: `${ay.name} ${ay.is_current ? '(Current)' : ''}`,
                }))}
              />
              <Select
                label="Assigned Class"
                value={formData.class_id}
                onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                options={classes.map((c) => ({ value: c.id, label: c.name }))}
              />
              <Select
                label="Assigned Section"
                value={formData.section_id}
                onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                options={sections.map((s) => ({ value: s.id, label: s.name }))}
              />
            </div>

            <Input
              label="Assigned Roll Number"
              required
              placeholder="e.g. 15"
              value={formData.roll_number}
              onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
              helperText="Must be unique within the selected class and section"
            />
          </div>
        )}

        {/* SECTION 4: Parent / Guardian */}
        {activeStep === 4 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-1 border-b border-slate-100">
              Section 4: Primary Parent / Guardian Information
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Parent First Name"
                required
                placeholder="e.g. David"
                value={formData.parent_first_name}
                onChange={(e) => setFormData({ ...formData, parent_first_name: e.target.value })}
              />
              <Input
                label="Parent Last Name"
                placeholder="Leave blank to use student surname"
                value={formData.parent_last_name}
                onChange={(e) => setFormData({ ...formData, parent_last_name: e.target.value })}
              />
              <Select
                label="Relationship to Ward"
                value={formData.parent_relationship}
                onChange={(e) => setFormData({ ...formData, parent_relationship: e.target.value })}
                options={[
                  { value: 'Father', label: 'Father' },
                  { value: 'Mother', label: 'Mother' },
                  { value: 'Guardian', label: 'Legal Guardian' },
                  { value: 'Foster Parent', label: 'Foster Parent' },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Primary Phone Number"
                required
                type="tel"
                placeholder="+1 555-0123"
                value={formData.parent_phone}
                onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
              />
              <Input
                label="Parent Email Address"
                type="email"
                placeholder="parent@example.com"
                value={formData.parent_email}
                onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
              />
              <Input
                label="Occupation / Profession"
                placeholder="e.g. Software Architect"
                value={formData.parent_occupation}
                onChange={(e) => setFormData({ ...formData, parent_occupation: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Modal Controls */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            {activeStep > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveStep((prev) => (prev - 1) as any)}
              >
                ← Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>

            {activeStep < 4 ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setActiveStep((prev) => (prev + 1) as any)}
              >
                Next Section →
              </Button>
            ) : (
              <Button type="submit" size="sm" isLoading={isSubmitting}>
                Complete Admission &amp; Enroll
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};
