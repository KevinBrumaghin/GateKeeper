import React, { useState, useEffect } from 'react';
import { Member, TimeLog, AppMode, EmployeeAction, AuditLogEntry } from '../types';
import { db } from '../services/db';
import { X, Save, Clock, Calendar, FileText, Activity, AlertCircle, Edit2, Check, Archive, Plus, RotateCcw } from 'lucide-react';

interface MemberDetailModalProps {
  member: Member;
  mode: AppMode;
  onClose: () => void;
  onUpdate: () => void;
}

const MemberDetailModal: React.FC<MemberDetailModalProps> = ({ member, mode, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'TIMESHEET' | 'HISTORY'>('DETAILS');
  const [formData, setFormData] = useState<Member>({ ...member });
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  
  // Editing state
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editLogData, setEditLogData] = useState<{ date: string; time: string; action: EmployeeAction }>({ date: '', time: '', action: 'CLOCK_IN' });
  
  // Adding state
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [newLogData, setNewLogData] = useState<{ date: string; time: string; action: EmployeeAction }>({ 
      date: new Date().toISOString().split('T')[0], 
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}), 
      action: 'CLOCK_IN' 
  });

  // Archive Confirm
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [waiverImage, setWaiverImage] = useState<string | undefined>(undefined);

  useEffect(() => {
    const loadLogs = async () => {
        if (mode === 'EMPLOYEE') {
            setIsLoadingLogs(true);
            const logs = await db.getMemberTimeLogs(member.id);
            setTimeLogs(logs);
            setIsLoadingLogs(false);
        }
    };
    loadLogs();
    
    const settings = db.getSettings();
    setWaiverImage(settings.waiverImage);
  }, [member.id, mode]);

  const handleSaveDetails = async () => {
    const updatedMember = { ...formData };
    
    // Log change if manual expiration update
    if (member.expirationDate !== formData.expirationDate) {
        updatedMember.auditLogs = [
            ...(updatedMember.auditLogs || []),
            {
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                action: 'UPDATE_EXPIRATION',
                details: `Changed expiration from ${new Date(member.expirationDate).toLocaleDateString()} to ${new Date(formData.expirationDate).toLocaleDateString()}`,
                adminUser: 'Admin'
            }
        ];
    }

    await db.updateMember(updatedMember);
    onUpdate();
    onClose();
  };

  const handleArchiveMember = async () => {
      await db.archiveMember(member.id);
      onUpdate();
      onClose();
  };
  
  const handleRestoreMember = async () => {
      // In cloud, restore is just flipping the status back
      const restored = { ...member, status: 'ACTIVE' as const };
      await db.updateMember(restored);
      onUpdate();
      onClose();
  }

  const startEditLog = (log: TimeLog) => {
      const dt = new Date(log.timestamp);
      // Format for datetime-local input
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      const hours = String(dt.getHours()).padStart(2, '0');
      const minutes = String(dt.getMinutes()).padStart(2, '0');
      
      setEditLogData({
          date: `${year}-${month}-${day}`,
          time: `${hours}:${minutes}`,
          action: log.action
      });
      setEditingLogId(log.id);
  };

  const saveEditLog = async () => {
      if (editingLogId) {
          const newIso = new Date(`${editLogData.date}T${editLogData.time}`).toISOString();
          await db.updateTimeLog(editingLogId, newIso, editLogData.action, 'Admin');
          
          const logs = await db.getMemberTimeLogs(member.id);
          setTimeLogs(logs);
          setEditingLogId(null);
          onUpdate();
      }
  };

  const handleAddLog = async () => {
      const newIso = new Date(`${newLogData.date}T${newLogData.time}`).toISOString();
      await db.addManualTimeLog(member.id, newIso, newLogData.action, 'Admin');
      
      const logs = await db.getMemberTimeLogs(member.id);
      setTimeLogs(logs);
      setIsAddingLog(false);
      onUpdate();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
            <div className="flex items-center gap-4">
                <div className={`h-14 w-14 rounded-full flex items-center justify-center font-bold text-2xl ${member.status === 'ARCHIVED' ? 'bg-gray-400 text-white' : 'bg-blue-600 text-white'}`}>
                    {member.name.charAt(0)}
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        {formData.name} 
                        {member.status === 'ARCHIVED' && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full uppercase">Archived</span>}
                    </h2>
                    <p className="text-sm text-gray-500 font-mono">ID: {member.memberNumber} • {mode === 'MEMBERSHIP' ? 'Member' : 'Employee'}</p>
                </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={24} className="text-gray-500" />
            </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 gap-6 bg-white">
            <button 
                onClick={() => setActiveTab('DETAILS')}
                className={`py-4 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'DETAILS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <Activity size={16} /> Details & Profile
            </button>
            {mode === 'EMPLOYEE' && (
                <button 
                    onClick={() => setActiveTab('TIMESHEET')}
                    className={`py-4 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'TIMESHEET' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <Clock size={16} /> Time Logs
                </button>
            )}
            <button 
                onClick={() => setActiveTab('HISTORY')}
                className={`py-4 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'HISTORY' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <FileText size={16} /> Change Log
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
            
            {activeTab === 'DETAILS' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Basic Info Form */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <Edit2 size={16} className="text-blue-500"/> Edit Profile
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                                <input 
                                    type="text" 
                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ID Number</label>
                                <input 
                                    type="text" 
                                    className="bg-gray-100 border border-gray-300 text-gray-500 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 cursor-not-allowed"
                                    value={formData.memberNumber}
                                    disabled
                                    title="ID Number cannot be changed"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
                                <input 
                                    type="text" 
                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                                    value={formData.phoneNumber}
                                    onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                                <input 
                                    type="email" 
                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address</label>
                                <input 
                                    type="text" 
                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                                    value={formData.address}
                                    onChange={e => setFormData({...formData, address: e.target.value})}
                                />
                            </div>
                            {mode === 'EMPLOYEE' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Department</label>
                                    <select
                                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                                        value={formData.department}
                                        onChange={e => setFormData({...formData, department: e.target.value})}
                                    >
                                        <option value="">Select Department...</option>
                                        {db.getSettings().departments.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mode Specific Settings */}
                    <div className="space-y-6">
                        {mode === 'MEMBERSHIP' && (
                            <>
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <Calendar size={16} className="text-blue-500"/> Membership Settings
                                    </h3>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expiration Date</label>
                                        <input 
                                            type="date" 
                                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                                            value={formData.expirationDate.split('T')[0]}
                                            onChange={e => setFormData({...formData, expirationDate: new Date(e.target.value).toISOString()})}
                                        />
                                        <p className="text-xs text-gray-400 mt-2">
                                            Current Status: {new Date(formData.expirationDate) < new Date() ? 
                                            <span className="text-red-500 font-bold">EXPIRED</span> : 
                                            <span className="text-green-500 font-bold">ACTIVE</span>}
                                        </p>
                                    </div>
                                </div>

                                {/* Waiver View */}
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <FileText size={16} className="text-blue-500"/> Liability Waiver
                                    </h3>
                                    {waiverImage && (
                                        <div className="mb-4">
                                            <a href={waiverImage} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                                {waiverImage.startsWith('data:application/pdf') ? <FileText size={12} /> : <FileText size={12} />}
                                                {waiverImage.startsWith('data:application/pdf') ? 'View Reference PDF' : 'View Reference Image'}
                                            </a>
                                        </div>
                                    )}
                                    {member.hasWaiver && member.waiverSignature ? (
                                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-center">
                                            <img src={member.waiverSignature} alt="Signature" className="max-h-32 mx-auto mix-blend-multiply" />
                                            <p className="text-xs text-gray-400 mt-2">Signed on {new Date(member.joinedDate).toLocaleDateString()}</p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-orange-500 bg-orange-50 p-4 rounded-lg">
                                            <AlertCircle size={20} />
                                            <span className="font-semibold text-sm">Waiver Not Signed</span>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'TIMESHEET' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button 
                            onClick={() => setIsAddingLog(!isAddingLog)}
                            className="text-sm bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-100 flex items-center gap-2 transition-colors"
                        >
                            <Plus size={16} /> Add Manual Entry
                        </button>
                    </div>
                    
                    {isAddingLog && (
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                            <h4 className="font-bold text-blue-800 mb-3 text-sm">New Time Log Entry</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                                <div>
                                    <label className="block text-xs font-bold text-blue-600 mb-1">Date</label>
                                    <input type="date" className="w-full p-2 rounded border border-blue-200 text-sm bg-white text-gray-900" value={newLogData.date} onChange={e => setNewLogData({...newLogData, date: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-blue-600 mb-1">Time</label>
                                    <input type="time" className="w-full p-2 rounded border border-blue-200 text-sm bg-white text-gray-900" value={newLogData.time} onChange={e => setNewLogData({...newLogData, time: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-blue-600 mb-1">Action</label>
                                    <select className="w-full p-2 rounded border border-blue-200 text-sm bg-white text-gray-900" value={newLogData.action} onChange={e => setNewLogData({...newLogData, action: e.target.value as EmployeeAction})}>
                                        <option value="CLOCK_IN">CLOCK IN</option>
                                        <option value="CLOCK_OUT">CLOCK OUT</option>
                                        <option value="BREAK_START">START BREAK</option>
                                        <option value="BREAK_END">END BREAK</option>
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleAddLog} className="flex-1 bg-blue-600 text-white py-2 rounded font-bold text-sm hover:bg-blue-700">Save</button>
                                    <button onClick={() => setIsAddingLog(false)} className="px-3 bg-white text-gray-500 py-2 rounded font-bold text-sm hover:bg-gray-100 border border-gray-200">Cancel</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Edit</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {isLoadingLogs ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                            Loading logs...
                                        </td>
                                    </tr>
                                ) : timeLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50 group">
                                        {editingLogId === log.id ? (
                                            <>
                                                <td className="px-6 py-4">
                                                    <input 
                                                        type="date" 
                                                        className="border rounded px-2 py-1 text-sm w-full bg-white text-gray-900"
                                                        value={editLogData.date}
                                                        onChange={e => setEditLogData({...editLogData, date: e.target.value})}
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input 
                                                        type="time" 
                                                        className="border rounded px-2 py-1 text-sm w-full bg-white text-gray-900"
                                                        value={editLogData.time}
                                                        onChange={e => setEditLogData({...editLogData, time: e.target.value})}
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select 
                                                        className="border rounded px-2 py-1 text-sm w-full bg-white text-gray-900"
                                                        value={editLogData.action}
                                                        onChange={e => setEditLogData({...editLogData, action: e.target.value as EmployeeAction})}
                                                    >
                                                        <option value="CLOCK_IN">CLOCK IN</option>
                                                        <option value="CLOCK_OUT">CLOCK OUT</option>
                                                        <option value="BREAK_START">START BREAK</option>
                                                        <option value="BREAK_END">END BREAK</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-orange-500">Editing...</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={saveEditLog} className="text-green-600 hover:text-green-800 p-1 bg-green-50 rounded">
                                                            <Check size={16} />
                                                        </button>
                                                        <button onClick={() => setEditingLogId(null)} className="text-gray-400 hover:text-gray-600 p-1">
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {new Date(log.timestamp).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                                                    {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${log.action.includes('IN') || log.action.includes('END') ? 'bg-green-100 text-green-800' : 
                                                        log.action.includes('BREAK') ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {log.action.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 italic">
                                                    {log.isEdited ? 'Edited' : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button 
                                                        onClick={() => startEditLog(log)}
                                                        className="text-blue-600 hover:text-blue-900 font-bold px-2 py-1 hover:bg-blue-50 rounded"
                                                    >
                                                        Edit
                                                    </button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                                {!isLoadingLogs && timeLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm italic">
                                            No time logs found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'HISTORY' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-bold text-gray-800 mb-6">Audit Trail & Change Log</h3>
                    <div className="space-y-6 relative border-l-2 border-gray-200 ml-3">
                        {member.auditLogs && member.auditLogs.length > 0 ? (
                            member.auditLogs.map((log) => (
                                <div key={log.id} className="ml-6 relative">
                                    <div className="absolute -left-[31px] bg-white border-2 border-gray-200 rounded-full h-4 w-4"></div>
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                                        <div>
                                            <p className="font-semibold text-gray-900">{log.action.replace('_', ' ')}</p>
                                            <p className="text-sm text-gray-500 mt-1">{log.details}</p>
                                        </div>
                                        <div className="text-right mt-1 sm:mt-0">
                                            <p className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleDateString()}</p>
                                            <p className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</p>
                                            <p className="text-xs font-bold text-blue-500 mt-1">{log.adminUser}</p>
                                        </div>
                                    </div>
                                </div>
                            )).reverse()
                        ) : (
                             <div className="ml-6 text-sm text-gray-400 italic">No changes recorded.</div>
                        )}
                        
                        {/* Creation Event */}
                         <div className="ml-6 relative">
                            <div className="absolute -left-[31px] bg-blue-500 border-2 border-blue-500 rounded-full h-4 w-4"></div>
                            <div>
                                <p className="font-semibold text-gray-900">RECORD CREATED</p>
                                <p className="text-sm text-gray-500 mt-1">User added to system.</p>
                                <p className="text-xs text-gray-400 mt-1">{new Date(member.joinedDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-between items-center gap-3">
            {member.status !== 'ARCHIVED' ? (
                !showArchiveConfirm ? (
                     <button 
                        onClick={() => setShowArchiveConfirm(true)}
                        className="px-4 py-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors flex items-center gap-2 text-sm font-semibold"
                    >
                        <Archive size={16} /> Archive User
                    </button>
                ) : (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                        <span className="text-sm text-gray-600 font-medium">Archive?</span>
                        <button 
                            onClick={handleArchiveMember}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-bold hover:bg-red-700"
                        >
                            Yes
                        </button>
                        <button 
                            onClick={() => setShowArchiveConfirm(false)}
                            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                    </div>
                )
            ) : (
                 <button 
                    onClick={handleRestoreMember}
                    className="px-4 py-2 text-blue-500 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors flex items-center gap-2 text-sm font-semibold"
                >
                    <RotateCcw size={16} /> Restore User
                </button>
            )}

            <div className="flex gap-3">
                <button 
                    onClick={onClose}
                    className="px-6 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSaveDetails}
                    className="px-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center gap-2"
                >
                    <Save size={18} /> Save Changes
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MemberDetailModal;