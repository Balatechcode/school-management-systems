/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal.js';
import { Button } from '../../components/common/Button.js';
import { Input } from '../../components/common/Input.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../components/common/Toast.js';
import { ShieldCheck, User, Mail, Lock, Phone } from 'lucide-react';

interface InitialAdminSetupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InitialAdminSetup: React.FC<InitialAdminSetupProps> = ({ isOpen, onClose }) => {
  const { createInitialAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [username, setUsername] = useState('superadmin');
  const [email, setEmail] = useState('admin@greenwoodacademy.edu');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('Primary');
  const [lastName, setLastName] = useState('Administrator');
  const [phone, setPhone] = useState('+1 (555) 900-1122');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    const res = await createInitialAdmin({
      username: username.trim(),
      email: email.trim(),
      password,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim(),
    });

    setIsSubmitting(false);

    if (res.success) {
      success('Initial Administrator successfully created!');
      onClose();
    } else {
      setErrorMsg(res.message || 'Failed to initialize administrator');
      toastError(res.message || 'Setup error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Initial System Administrator"
      description="Secure first-time administrator account creation. No hardcoded passwords are used."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <Input
            label="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>

        <Input
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          leftIcon={<User className="w-4 h-4" />}
          helperText="Unique username used for identification"
          required
        />

        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="w-4 h-4" />}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Password"
            type="password"
            placeholder="Min 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />
        </div>

        <Input
          label="Phone Number"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          leftIcon={<Phone className="w-4 h-4" />}
        />

        <div className="pt-2 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            leftIcon={<ShieldCheck className="w-4 h-4" />}
          >
            Create Root Administrator
          </Button>
        </div>
      </form>
    </Modal>
  );
};
