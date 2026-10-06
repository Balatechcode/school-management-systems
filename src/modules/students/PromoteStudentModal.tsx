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
import { StudentWithDetails, AcademicYear, SchoolClass, Section } from '../../types/index.js';
import { useToast } from '../../components/common/Toast.js';
import { GraduationCap, ArrowRight, ShieldCheck } from 'lucide-react';

interface PromoteStudentModalProps {
  isOpen: boolean;
  student: StudentWithDetails | null;
  onClose: () => void;
  onPromoted: () => void;
}

export const PromoteStudentModal: React.FC<PromoteStudentModalProps> = ({
  isOpen,
  student,
  onClose,
  onPromoted,
}) => {
  const { success, error: toastError } = useToast();

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [targetYearId, setTargetYearId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [targetSectionId, setTargetSectionId] = useState('');
  const [targetRollNo, setTargetRollNo] = useState('1');
  const [promotionNote, setPromotionNote] = useState('Promoted to next grade');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !student) return;
    const currentStudent = student;

    async function loadAcademicMeta() {
      const [ayRes, clsRes, secRes] = await Promise.all([
        api.get<AcademicYear[]>('/api/academic-years'),
        api.get<SchoolClass[]>('/api/classes'),
        api.get<Section[]>('/api/sections'),
      ]);

      if (ayRes.success && ayRes.data) {
        setAcademicYears(ayRes.data);
        // Find next or upcoming session
        const upcoming = ayRes.data.find((ay) => ay.status === 'UPCOMING') || ayRes.data[0];
        if (upcoming) setTargetYearId(upcoming.id);
      }

      if (clsRes.success && clsRes.data) {
        setClasses(clsRes.data);
        // Suggest next class in order
        const currentClassId = currentStudent.current_enrollment?.class_id;
        const currentIdx = clsRes.data.findIndex((c) => c.id === currentClassId);
        const nextClass = (currentIdx >= 0 && currentIdx + 1 < clsRes.data.length)
          ? clsRes.data[currentIdx + 1]
          : clsRes.data[0];
        if (nextClass) setTargetClassId(nextClass.id);
      }

      if (secRes.success && secRes.data && secRes.data.length > 0) {
        setSections(secRes.data);
        setTargetSectionId(currentStudent.current_enrollment?.section_id || secRes.data[0].id);
      }

      setTargetRollNo(currentStudent.current_enrollment?.roll_number || '1');
    }

    loadAcademicMeta();
  }, [isOpen, student]);

  if (!student) return null;

  const currentEnrollment = student.current_enrollment;

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEnrollment) {
      toastError('Student has no active enrollment to promote from.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/api/enrollments/promote', {
        student_id: student.id,
        current_enrollment_id: currentEnrollment.id,
        academic_year_id: targetYearId,
        class_id: targetClassId,
        section_id: targetSectionId,
        roll_number: targetRollNo.trim(),
        promotion_status: promotionNote.trim(),
      });

      if (res.success) {
        success(`${student.first_name} promoted successfully! Historical records preserved.`);
        onPromoted();
        onClose();
      } else {
        toastError(res.message || 'Promotion failed');
      }
    } catch (err: any) {
      toastError(err.message || 'Promotion error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Promote Student to Next Academic Session"
      description="Preserve previous academic transcripts and create a new placement record."
      maxWidth="lg"
    >
      <form onSubmit={handlePromote} className="space-y-4">
        {/* Student & Prior Class Summary */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 block">Student</span>
            <strong className="text-slate-900 text-sm">
              {student.first_name} {student.last_name}
            </strong>
            <span className="text-slate-500 font-mono ml-2">({student.admission_number})</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 block">Current Placement</span>
            <span className="font-semibold text-indigo-700">
              {currentEnrollment?.school_class?.name || 'Unassigned'} - {currentEnrollment?.section?.code || '—'}
            </span>
            <span className="text-slate-400 block text-[10px] font-mono">
              Roll No: {currentEnrollment?.roll_number || '—'}
            </span>
          </div>
        </div>

        {/* Promotion Arrow Notice */}
        <div className="p-2.5 rounded-lg bg-indigo-50/80 border border-indigo-200 text-indigo-900 text-xs flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            The previous enrollment record will be archived as <strong>PROMOTED</strong>, retaining all historical grades and attendance.
          </span>
        </div>

        {/* Target Placement */}
        <div className="space-y-3 pt-1">
          <Select
            label="Target Academic Session"
            value={targetYearId}
            onChange={(e) => setTargetYearId(e.target.value)}
            options={academicYears.map((ay) => ({
              value: ay.id,
              label: `${ay.name} (${ay.status})`,
            }))}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="New Class"
              value={targetClassId}
              onChange={(e) => setTargetClassId(e.target.value)}
              options={classes.map((c) => ({ value: c.id, label: c.name }))}
              required
            />
            <Select
              label="New Section"
              value={targetSectionId}
              onChange={(e) => setTargetSectionId(e.target.value)}
              options={sections.map((s) => ({ value: s.id, label: s.name }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="New Roll Number"
              required
              value={targetRollNo}
              onChange={(e) => setTargetRollNo(e.target.value)}
              helperText="Unique within target class and section"
            />
            <Input
              label="Promotion Remark / Status"
              value={promotionNote}
              onChange={(e) => setPromotionNote(e.target.value)}
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting} leftIcon={<GraduationCap className="w-4 h-4" />}>
            Confirm Student Promotion
          </Button>
        </div>
      </form>
    </Modal>
  );
};
