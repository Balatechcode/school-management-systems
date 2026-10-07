/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Radio, ShieldCheck, QrCode } from 'lucide-react';
import { Modal } from '../../../components/common/Modal.js';
import { Button } from '../../../components/common/Button.js';
import { ClassAttendanceRosterItem } from '../../../types/index.js';

interface GateScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanCardInput: string;
  onScanCardInputChange: (val: string) => void;
  isScanning: boolean;
  onSimulateTap: () => void;
  roster: ClassAttendanceRosterItem[];
  lastScannedStudent: any;
}

export const GateScannerModal: React.FC<GateScannerModalProps> = ({
  isOpen,
  onClose,
  scanCardInput,
  onScanCardInputChange,
  isScanning,
  onSimulateTap,
  roster,
  lastScannedStudent,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="RFID & Biometric Gate Scanner Simulator"
      description="Simulate real-time hardware turnstile check-ins using student RFID card numbers."
      maxWidth="lg"
    >
      <div className="space-y-5 text-xs text-slate-600">
        <div className="bg-slate-900 text-slate-200 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">Gate Terminal: MAIN_GATE_IN_01</div>
              <div className="text-[11px] text-slate-400">Firmware: EduCore ESP32 IoT Node v2.4</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-mono bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5" />
            Online
          </div>
        </div>

        {/* Card Number Input */}
        <div>
          <label className="block text-slate-700 font-semibold mb-1">
            RFID Card UID / Smart ID Card
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. CARD-2026-0001"
              value={scanCardInput}
              onChange={(e) => onScanCardInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSimulateTap()}
              className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
            />
            <Button
              size="sm"
              variant="primary"
              leftIcon={<QrCode className="w-3.5 h-3.5" />}
              isLoading={isScanning}
              onClick={onSimulateTap}
            >
              Simulate Tap
            </Button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Authenticates via secure hardware API key header (<code>x-device-api-key</code>) to <code>/api/v1/attendance/device-tap</code>.
          </p>
        </div>

        {/* Quick Pick Cards from Loaded Roster */}
        <div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Quick Select Student Card to Tap:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {roster.slice(0, 5).map((s) => (
              <button
                key={s.student_id}
                type="button"
                onClick={() => onScanCardInputChange(s.rfid_card_number || `CARD-${s.roll_number || '01'}`)}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 text-[10px] font-mono cursor-pointer transition-colors"
              >
                {s.first_name} ({s.rfid_card_number || `CARD-${s.roll_number || '01'}`})
              </button>
            ))}
          </div>
        </div>

        {/* Last Scanned Confirmation Card */}
        {lastScannedStudent && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-emerald-900 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <img
                src={
                  lastScannedStudent.student.photo_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    lastScannedStudent.student.name
                  )}&background=059669&color=ffffff`
                }
                alt={lastScannedStudent.student.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 shrink-0"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-emerald-950">
                    {lastScannedStudent.student.name}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                    {lastScannedStudent.attendance.status}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  {lastScannedStudent.student.class_name} — {lastScannedStudent.student.section_name} (Roll #{lastScannedStudent.student.roll_number})
                </p>
                <p className="text-[10px] text-emerald-700 font-mono mt-0.5">
                  Arrival Time: {lastScannedStudent.attendance.check_in_time} • Gate: {lastScannedStudent.attendance.device_id}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
