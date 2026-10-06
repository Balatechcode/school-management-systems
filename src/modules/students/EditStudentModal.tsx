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
import { StudentWithDetails, StudentStatus } from '../../types/index.js';
import { useToast } from '../../components/common/Toast.js';

interface EditStudentModalProps {
  isOpen: boolean;
  student: StudentWithDetails | null;
  onClose: () => void;
  onUpdated: () => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  student,
  onClose,
  onUpdated,
}) => {
  const { success, error: toastError } = useToast();
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (student) {
      setFormData({
        first_name: student.first_name,
        middle_name: student.middle_name || '',
        last_name: student.last_name,
        gender: student.gender || 'Male',
        date_of_birth: student.date_of_birth || '',
        blood_group: student.blood_group || '',
        nationality: student.nationality || '',
        category: student.category || '',
        phone: student.phone || '',
        email: student.email || '',
        address: student.address || '',
        city: student.city || '',
        state: student.state || '',
        pincode: student.pincode || '',
        status: student.status,
      });
    }
  }, [student]);

  if (!student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.put(`/api/students/${student.id}`, formData);
      if (res.success) {
        success('Student profile updated successfully!');
        onUpdated();
        onClose();
      } else {
        toastError(res.message || 'Update failed');
      }
    } catch (err: any) {
      toastError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Profile: ${student.first_name} ${student.last_name}`}
      description="Update student personal, contact, and enrollment status."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="First Name"
            required
            value={formData.first_name || ''}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
          />
          <Input
            label="Middle Name"
            value={formData.middle_name || ''}
            onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
          />
          <Input
            label="Last Name"
            required
            value={formData.last_name || ''}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Gender"
            value={formData.gender || 'Male'}
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
            value={formData.date_of_birth || ''}
            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
          />
          <Select
            label="Status"
            value={formData.status || 'ACTIVE'}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as StudentStatus })}
            options={[
              { value: 'ACTIVE', label: 'ACTIVE' },
              { value: 'INACTIVE', label: 'INACTIVE' },
              { value: 'TRANSFERRED', label: 'TRANSFERRED' },
              { value: 'PASSED_OUT', label: 'PASSED_OUT' },
              { value: 'LEFT', label: 'LEFT' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Phone"
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <Input
          label="Street Address"
          value={formData.address || ''}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="City"
            value={formData.city || ''}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
          <Input
            label="State"
            value={formData.state || ''}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
          />
          <Input
            label="Postal Code"
            value={formData.pincode || ''}
            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
          />
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
