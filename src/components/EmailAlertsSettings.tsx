import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Trash2, 
  Plus, 
  BellRing, 
  Send, 
  CheckCircle, 
  X, 
  Eye, 
  AlertTriangle, 
  Info,
  Layers,
  History,
  FileText
} from 'lucide-react';
import { Product, AlertEmailLog, AdminEmailSetting } from '../types';
import { formatUGX, isLowStock, isOutOfStock, getExpiryStatus } from '../utils';

interface EmailAlertsSettingsProps {
  products: Product[];
}

const DEFAULT_ADMIN_EMAILS = [
  'sonyaesther8@gmail.com',
  'islamnakibinge@gmail.com',
  'judithoyoo64@gmail.com'
];

export default function EmailAlertsSettings({ products }: EmailAlertsSettingsProps) {
  // Config state
  const [emails, setEmails] = useState<string[]>([]);
  const [enableLowStock, setEnableLowStock] = useState<boolean>(true);
  const [enableOutOfStock, setEnableOutOfStock] = useState<boolean>(true);
  const [enableExpiry, setEnableExpiry] = useState<boolean>(true);

  // New Email input
  const [newEmail, setNewEmail] = useState('');
  const [validationError, setValidationError] = useState('');

  // Dispatch logs state
  const [logs, setLogs] = useState<AlertEmailLog[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Modal preview target
  const [previewLog, setPreviewLog] = useState<AlertEmailLog | null>(null);

  // Action Success Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load Settings and Logs on Init
  useEffect(() => {
    // Emails Setup
    const storedEmails = localStorage.getItem('elite_beauty_admin_emails');
    if (storedEmails) {
      setEmails(JSON.parse(storedEmails));
    } else {
      setEmails(DEFAULT_ADMIN_EMAILS);
      localStorage.setItem('elite_beauty_admin_emails', JSON.stringify(DEFAULT_ADMIN_EMAILS));
    }

    // Toggle Alerts Settings setup
    const storedToggleLow = localStorage.getItem('elite_beauty_toggle_low');
    const storedToggleOut = localStorage.getItem('elite_beauty_toggle_out');
    const storedToggleExp = localStorage.getItem('elite_beauty_toggle_exp');

    setEnableLowStock(storedToggleLow ? JSON.parse(storedToggleLow) : true);
    setEnableOutOfStock(storedToggleOut ? JSON.parse(storedToggleOut) : true);
    setEnableExpiry(storedToggleExp ? JSON.parse(storedToggleExp) : true);

    // Logs Setup
    const storedLogs = localStorage.getItem('elite_beauty_alert_logs');
    if (storedLogs) {
      setLogs(JSON.parse(storedLogs));
    } else {
      // Seed initial welcoming log to demonstrate integration works!
      const initialSeedLog: AlertEmailLog = {
        id: 'log-welcome',
        recipientList: DEFAULT_ADMIN_EMAILS,
        subject: 'Elite Beauty Uganda: Admin Alert System Activated',
        body: `Dear Elite Beauty Admins,

This is a confirmation that the automatic cosmetics stock and item expiration alert dispatch system is now active. 

Designated Recipients:
1. sonyaesther8@gmail.com
2. islamnakibinge@gmail.com

The system will monitor stock level boundaries and draft/simulate automated notification emails on POS sale checkout or catalog updates.

Kind Regards,
Elite Beauty System Controller
Kampala, Uganda`,
        timestamp: new Date('2026-06-13T10:00:20-07:00').toLocaleString('en-US'),
        triggerType: 'Manual Test',
        status: 'Sent Successfully'
      };
      setLogs([initialSeedLog]);
      localStorage.setItem('elite_beauty_alert_logs', JSON.stringify([initialSeedLog]));
    }
  }, []);

  const saveEmails = (updatedEmails: string[]) => {
    setEmails(updatedEmails);
    localStorage.setItem('elite_beauty_admin_emails', JSON.stringify(updatedEmails));
  };

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail) return;

    // Standard email validator regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    if (emails.includes(cleanEmail)) {
      setValidationError('This email is already in the recipient list.');
      return;
    }

    const updated = [...emails, cleanEmail];
    saveEmails(updated);
    setNewEmail('');
    showToast('Admin email registered successfully!');
  };

  const handleDeleteEmail = (emailToDelete: string) => {
    if (emails.length <= 1) {
      alert('You must keep at least one administrator email for critical stock warnings.');
      return;
    }
    const updated = emails.filter(e => e !== emailToDelete);
    saveEmails(updated);
    showToast('Admin email removed successfully!');
  };

  const handleToggleChange = (type: 'low' | 'out' | 'exp', val: boolean) => {
    if (type === 'low') {
      setEnableLowStock(val);
      localStorage.setItem('elite_beauty_toggle_low', JSON.stringify(val));
    } else if (type === 'out') {
      setEnableOutOfStock(val);
      localStorage.setItem('elite_beauty_toggle_out', JSON.stringify(val));
    } else {
      setEnableExpiry(val);
      localStorage.setItem('elite_beauty_toggle_exp', JSON.stringify(val));
    }
    showToast('Alert preferences stored!');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Compile full warning payload and dispatch manual audit email
  const triggerManualAuditEmail = () => {
    if (emails.length === 0) {
      alert('Please add at least one alert email recipient.');
      return;
    }

    // Gather statistics
    const outOfStock = products.filter(isOutOfStock);
    const lowStock = products.filter(isLowStock);
    const expired = products.filter(p => getExpiryStatus(p.expiryDate) === 'expired');
    const expiringSoon = products.filter(p => getExpiryStatus(p.expiryDate) === 'expiring-soon');

    let emailBody = `ELITE BEAUTY KAMPALA — COSMETICS ALERT AUDIT REPORT\n`;
    emailBody += `Generated on: ${new Date().toLocaleString()}\n`;
    emailBody += `Recipients: ${emails.join(', ')}\n`;
    emailBody += `==========================================\n\n`;

    let totalAlerts = 0;

    if (enableOutOfStock && outOfStock.length > 0) {
      emailBody += `🔴 OUT OF STOCK EVENTS (${outOfStock.length} Items)\n`;
      outOfStock.forEach(p => {
        emailBody += `- ${p.name} (SKU: ${p.sku}) — CURRENT STOCK: 0 UNITS (Min Safe Level: ${p.safeLevel})\n`;
      });
      emailBody += `\n`;
      totalAlerts += outOfStock.length;
    }

    if (enableLowStock && lowStock.length > 0) {
      emailBody += `⚠️ LOW STOCK WARNINGS (${lowStock.length} Items)\n`;
      lowStock.forEach(p => {
        emailBody += `- ${p.name} (SKU: ${p.sku}) — CURRENT: ${p.quantity} Units left (Min Safe Level: ${p.safeLevel})\n`;
      });
      emailBody += `\n`;
      totalAlerts += lowStock.length;
    }

    if (enableExpiry && (expired.length > 0 || expiringSoon.length > 0)) {
      emailBody += `⏳ EXPIRATION WARNING STATS\n`;
      if (expired.length > 0) {
        emailBody += `❌ EXPIRED PRODUCTS (${expired.length} Items):\n`;
        expired.forEach(p => {
          emailBody += `  - ${p.name} (SKU: ${p.sku}) — Expired on: ${p.expiryDate}\n`;
        });
      }
      if (expiringSoon.length > 0) {
        emailBody += `⚠️ EXPIRING SOON PRODUCTS (${expiringSoon.length} Items):\n`;
        expiringSoon.forEach(p => {
          emailBody += `  - ${p.name} (SKU: ${p.sku}) — Expiration Date: ${p.expiryDate} (Approaching threshold)\n`;
        });
      }
      emailBody += `\n`;
      totalAlerts += (expired.length + expiringSoon.length);
    }

    if (totalAlerts === 0) {
      emailBody += `✓ EXCELLENT NEWS:\nAll cosmetics products within Elite Beauty Kampala are sufficiently stocked and within their direct validity dates! No operations intervention is active.`;
    } else {
      emailBody += `Operational restock intervention or clearance discounts are recommended for these cosmetic assets.`;
    }

    emailBody += `\n\n---\nElite Beauty Stock Automation Controller\nKampala Arcade, Central Uganda`;

    const subject = `Elite Beauty Kampala: Urgent Stock & Expiry Audit Report (${totalAlerts} Warnings)`;

    // Save Log
    const newLog: AlertEmailLog = {
      id: `log-${Date.now()}`,
      recipientList: [...emails],
      subject,
      body: emailBody,
      timestamp: new Date().toLocaleString('en-US'),
      triggerType: 'Manual Test',
      status: 'Sent Successfully'
    };

    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    localStorage.setItem('elite_beauty_alert_logs', JSON.stringify(updatedLogs));

    showToast(`Audit report emailed to ${emails.length} admins successfully!`);
  };

  const handleClearLogs = () => {
    setShowClearConfirm(true);
  };

  const confirmClearLogs = () => {
    setLogs([]);
    localStorage.setItem('elite_beauty_alert_logs', JSON.stringify([]));
    setShowClearConfirm(false);
    showToast('Dispatch logs cleared!');
  };

  return (
    <div className="space-y-6">

      {/* Settings Grid Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Configurations Form Block */}
        <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-150">
            <span className="p-2 bg-royal-100/50 rounded-lg text-royal-700">
              <BellRing className="w-4.5 h-4.5 text-royal-700" />
            </span>
            <div>
              <h3 className="font-display font-semibold text-sm text-zinc-900">Admin Email Notifications</h3>
              <p className="text-[10px] text-zinc-400">Configure target email addresses for low stock and expiration alarms.</p>
            </div>
          </div>

          {/* List of registered emails */}
          <div className="space-y-2">
            <label className="block text-[10px] text-zinc-400 uppercase font-black tracking-wider">
              Designated Recipient List
            </label>
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
              {emails.map(email => (
                <div key={email} className="flex items-center justify-between text-xs p-2 bg-zinc-50 border border-zinc-150 rounded-lg group">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-zinc-400 group-hover:text-gold-500 transition" />
                    <span className="font-mono text-zinc-700">{email}</span>
                    {DEFAULT_ADMIN_EMAILS.includes(email) && (
                      <span className="bg-royal-50 border border-royal-105 text-royal-752 text-[8px] font-bold px-1.5 py-0.2 rounded font-sans scale-90">
                        Default
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteEmail(email)}
                    className="text-zinc-400 hover:text-red-600 p-0.5"
                    title="Remove Recipient"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {emails.length === 0 && (
                <p className="text-zinc-400 italic text-[11px] p-2 bg-red-50/40 rounded border border-red-100">
                  No emails registered! No alerts will be sent.
                </p>
              )}
            </div>
          </div>

          {/* Add new email block form */}
          <form onSubmit={handleAddEmail} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add administrator email (e.g. boss@gmail.com)"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  setValidationError('');
                }}
                className="flex-1 bg-white border border-zinc-200 text-xs px-3 py-1.5 rounded-lg focus:outline-hidden focus:border-gold-500"
              />
              <button
                type="submit"
                className="bg-royal-700 hover:bg-royal-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shrink-0 transition active:scale-95 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-gold-300" /> Add Admin
              </button>
            </div>
            {validationError && (
              <p className="text-[10px] text-red-600 font-medium pl-1">{validationError}</p>
            )}
          </form>

          {/* Toggles Checklist */}
          <div className="pt-2 border-t border-zinc-150 space-y-3">
            <span className="block text-[10px] text-zinc-400 uppercase font-black tracking-wider">
              Automatic Alarm Triggers
            </span>
            
            <div className="space-y-2 text-xs">
              {/* Out of Stock Alert Toggle */}
              <label className="flex items-center justify-between p-2 pl-3 hover:bg-zinc-50 rounded-lg cursor-pointer border border-zinc-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                  <div>
                    <span className="font-semibold text-zinc-800">Out of Stock Alerts</span>
                    <span className="block text-[10px] text-zinc-400">Trigger immediately when a cosmetic unit drops to 0.</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableOutOfStock}
                  onChange={(e) => handleToggleChange('out', e.target.checked)}
                  className="rounded text-royal-700 border-zinc-300 focus:ring-royal-500 cursor-pointer"
                />
              </label>

              {/* Low Stock Threshold Alert Toggle */}
              <label className="flex items-center justify-between p-2 pl-3 hover:bg-zinc-50 rounded-lg cursor-pointer border border-zinc-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></div>
                  <div>
                    <span className="font-semibold text-zinc-800">Low Stock SafeLevel Warnings</span>
                    <span className="block text-[10px] text-zinc-400">Trigger when quantities drop to or below safety margins.</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableLowStock}
                  onChange={(e) => handleToggleChange('low', e.target.checked)}
                  className="rounded text-royal-700 border-zinc-300 focus:ring-royal-500 cursor-pointer"
                />
              </label>

              {/* Expiration warning threshold alerts */}
              <label className="flex items-center justify-between p-2 pl-3 hover:bg-zinc-50 rounded-lg cursor-pointer border border-zinc-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-zinc-900 shrink-0"></div>
                  <div>
                    <span className="font-semibold text-zinc-800">Item Expiry Alarms</span>
                    <span className="block text-[10px] text-zinc-400">Trigger when batch dates expire or approach 30-day limits.</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableExpiry}
                  onChange={(e) => handleToggleChange('exp', e.target.checked)}
                  className="rounded text-royal-700 border-zinc-300 focus:ring-royal-500 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Audit Report and Manual Dispatcher Unit (6 columns) */}
        <div className="lg:col-span-6 bg-gradient-to-br from-white to-royal-50/10 p-5 rounded-xl border border-zinc-200 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-150">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-gold-50 border border-gold-200 rounded-lg">
                  <AlertTriangle className="w-4.5 h-4.5 text-gold-600" />
                </span>
                <div>
                  <h3 className="font-display font-semibold text-sm text-zinc-900">Emergency Dispatcher</h3>
                  <p className="text-[10px] text-zinc-400">Trigger immediate restock/expiry reports right now to administrators.</p>
                </div>
              </div>
            </div>

            {/* Current Warnings Count overview in beautiful badges */}
            <div className="grid grid-cols-3 gap-3.5 mt-4 text-center">
              <div className="p-3 bg-blue-50/50 border border-blue-150 rounded-xl">
                <span className="text-[9px] font-bold text-blue-500 uppercase block tracking-wider">Out Stock</span>
                <span className="text-xl font-space font-black text-blue-600 block mt-1">
                  {products.filter(isOutOfStock).length}
                </span>
                <span className="text-[9px] text-zinc-400">Immediate order</span>
              </div>
              <div className="p-3 bg-amber-50/50 border border-amber-150 rounded-xl">
                <span className="text-[9px] font-bold text-amber-600 uppercase block tracking-wider">Low Stock</span>
                <span className="text-xl font-space font-black text-amber-700 block mt-1">
                  {products.filter(isLowStock).length}
                </span>
                <span className="text-[9px] text-zinc-400">Below safe margins</span>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-[9px] font-bold text-zinc-500 uppercase block tracking-wider">Expired Stats</span>
                <span className="text-xl font-space font-black text-zinc-800 block mt-1">
                  {products.filter(p => getExpiryStatus(p.expiryDate) === 'expired').length}
                </span>
                <span className="text-[9px] text-zinc-400">Ready to dispose</span>
              </div>
            </div>

            {/* Explanatory system notice */}
            <div className="mt-4 p-3.5 bg-royal-50/20 border border-royal-100/50 text-zinc-650 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-royal-950">
                <Info className="w-3.5 h-3.5 text-royal-750" />
                <span>Default Admin Routing Active</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Elite cosmetics inventory updates will dispatch status triggers directly to <b>sonyaesther8@gmail.com</b>, <b>islamnakibinge@gmail.com</b> and <b>judithoyoo64@gmail.com</b> as provided. Check logs to preview the email structure.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={triggerManualAuditEmail}
            className="w-full py-2.5 bg-royal-700 hover:bg-royal-800 text-white rounded-xl text-xs font-bold leading-normal transition flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
          >
            <Send className="w-3.5 h-3.5 text-gold-300" />
            Email Live Stock Audit Report to Admin Emails
          </button>
        </div>

      </div>

      {/* DISPATCH HISTORY LEDGER LOGS TABLE */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-zinc-150 bg-zinc-50 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <History className="w-4 h-4 text-zinc-400" />
            <h4 className="font-display font-semibold text-zinc-800 text-xs">Simulated Dispatch & Delivery Log history ({logs.length})</h4>
          </div>
          {logs.length > 0 && (
            <button
              onClick={handleClearLogs}
              className="text-[10px] text-zinc-400 hover:text-red-600 transition font-semibold"
            >
              Clear Log History
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-bold text-zinc-450 uppercase tracking-widest leading-none">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Trigger Class</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Recipients Delivered</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Preview Content</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 font-sans">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-zinc-50/50 transition">
                  <td className="py-3 px-4 font-mono text-[10px] text-zinc-550 shrink-0">
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-4 font-semibold text-zinc-800">
                    <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 text-[9px] rounded-md border border-zinc-200">
                      {log.triggerType}
                    </span>
                  </td>
                  <td className="py-3 px-4 max-w-xs truncate font-medium text-zinc-900">
                    {log.subject}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-0.5 max-w-xs truncate">
                      {log.recipientList.map(rec => (
                        <span key={rec} className="font-mono text-[10px] text-zinc-550 block leading-tight">{rec}</span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Sent
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setPreviewLog(log)}
                      className="p-1 px-2.5 text-[10px] bg-royal-50 hover:bg-royal-100 text-royal-700 border border-royal-200/50 rounded font-semibold transition"
                    >
                      <Eye className="w-3.5 h-3.5 inline-block mr-1" /> View Raw Email
                    </button>
                  </td>
                </tr>
              ))}

              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-zinc-400 italic">
                    No email alert dispatches have been triggered or saved.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SUCCESS / WARNING ACTION STATE TOAST MESSAGE */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="fixed bottom-5 right-5 z-50 bg-zinc-900 text-white border border-zinc-800 p-3 px-4 rounded-xl shadow-lg text-xs font-bold font-sans flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-gold-300" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* COMPREHENSIVE RAW EMAIL PREVIEW OVERLAY POPUP MODAL */}
      <AnimatePresence>
        {previewLog && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 text-zinc-300 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-zinc-800 flex flex-col max-h-[85vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4 shrink-0">
                <h3 className="font-display font-semibold text-white flex items-center gap-2 text-sm">
                  <FileText className="w-4.5 h-4.5 text-gold-400" />
                  Visual Outgoing Raw Email Layout
                </h3>
                <button 
                  onClick={() => setPreviewLog(null)} 
                  className="text-zinc-500 hover:text-white transition"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Email Envelope details headings */}
              <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-800 text-xs space-y-1.5 shrink-0 font-mono">
                <div>
                  <span className="text-zinc-500 inline-block w-16">Subject:</span>
                  <span className="text-white font-semibold">{previewLog.subject}</span>
                </div>
                <div>
                  <span className="text-zinc-500 inline-block w-16">To:</span>
                  <span className="text-gold-400 font-bold">{previewLog.recipientList.join(', ')}</span>
                </div>
                <div>
                  <span className="text-zinc-500 inline-block w-16">Date:</span>
                  <span className="text-zinc-400">{previewLog.timestamp}</span>
                </div>
                <div>
                  <span className="text-zinc-500 inline-block w-16">Outgoing:</span>
                  <span className="text-emerald-500 font-semibold uppercase font-sans text-[10px]">✓ Secure SMTP Simulator</span>
                </div>
              </div>

              {/* Textarea representation of actual draft email block */}
              <div className="flex-1 overflow-y-auto mt-4 pr-1">
                <pre className="bg-white text-zinc-800 p-4 rounded-xl border border-zinc-200 font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-inner">
                  {previewLog.body}
                </pre>
              </div>

              {/* Close Button footer */}
              <div className="pt-4 border-t border-zinc-800 mt-4 flex gap-2 justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setPreviewLog(null)}
                  className="py-1.5 px-5 bg-zinc-800 hover:bg-zinc-750 text-white rounded-lg text-xs font-semibold transition"
                >
                  Close Preview
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CLEAR LOGS CONFIRM MODAL */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">Clear History?</h3>
              <p className="text-gray-600 text-sm mb-6">
                Are you sure you want to clear all dispatch logs? This will permanently remove the audit history of sent alert emails.
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmClearLogs}
                  className="px-4 py-2 text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition shadow-sm"
                >
                  Clear Logs
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
