import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Member, AppMode } from '../types';
import { Search, Plus, RefreshCw, Calendar, CheckCircle, AlertCircle, FileText, Clock, Coffee, LogOut, ChevronRight, Settings, Archive, Upload, X, Trash2, FileType } from 'lucide-react';
import { auth } from '../services/auth';
import MemberDetailModal from './MemberDetailModal';
import WaiverCanvas from './WaiverCanvas';

const AdminPanel: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [appMode, setAppMode] = useState<AppMode>('MEMBERSHIP');
  const [viewArchived, setViewArchived] = useState(false);

  // Add Member State
  const [creationStep, setCreationStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
      name: '',
      memberNumber: '',
      phoneNumber: '',
      email: '',
      address: '',
      department: ''
  });
  const [formError, setFormError] = useState('');

  // Settings State
  const [settingsText, setSettingsText] = useState('');
  const [settingsImage, setSettingsImage] = useState<string | undefined>(undefined);
  const [departments, setDepartments] = useState<string[]>([]);
  const [newDept, setNewDept] = useState('');

  useEffect(() => {
    const user = auth.getCurrentUser();
    if (user && user.mode) {
        setAppMode(user.mode);
    }
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setIsLoading(true);
    const data = await db.getMembers();
    setMembers(data);
    setIsLoading(false);
  };

  const openAddModal = async () => {
      const settings = db.getSettings();
      // Check for Waiver if in Membership mode
      if (appMode === 'MEMBERSHIP' && !settings.waiverText && !settings.waiverImage) {
          alert("Please configure your Liability Waiver in Settings before adding members.");
          setSettingsText(settings.waiverText);
          setSettingsImage(settings.waiverImage);
          setDepartments(settings.departments);
          setShowSettingsModal(true);
          return;
      }

      // Auto-generate ID on open
      try {
        const nextId = await db.getNextMemberId();
        setFormData({
            name: '',
            memberNumber: nextId,
            phoneNumber: '',
            email: '',
            address: '',
            department: settings.departments[0] || ''
        });
        setCreationStep(1);
        setShowAddModal(true);
      } catch (e) {
        console.error("Failed to init add modal", e);
      }
  };

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.memberNumber.trim()) {
        setFormError('ID Number is required.');
        return;
    }

    // Email Validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setFormError('Please enter a valid email address.');
        return;
    }

    // Address Validation (Simple length check)
    if (formData.address && formData.address.length < 5) {
        setFormError('Please enter a valid address.');
        return;
    }

    // Check for duplicate ID
    const exists = await db.findMemberByNumber(formData.memberNumber);
    if (exists) {
        setFormError('This ID Number is already taken.');
        return;
    }
    
    // If membership mode, go to waiver signature. If employee, just create.
    if (appMode === 'MEMBERSHIP') {
        setCreationStep(2);
    } else {
        // Create employee directly - skip waiver
        try {
            await db.createMember({
                ...formData,
                hasWaiver: false // No waiver needed for employees
            });
            setShowAddModal(false);
            loadMembers();
        } catch (e: any) {
            if (e.message === "Not authenticated") {
                alert("Your session has expired. Please logout and login again.");
            } else {
                setFormError("Error creating employee: " + e.message);
            }
        }
    }
  };

  const handleWaiverSigned = async (signature: string) => {
      try {
        await db.createMember({
            ...formData,
            hasWaiver: true,
            waiverSignature: signature
        });
        setShowAddModal(false);
        loadMembers();
      } catch (e: any) {
         if (e.message === "Not authenticated") {
             alert("Your session has expired. Please logout and login again to save this member.");
         } else {
             alert("Error creating member: " + e.message);
         }
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 5000000) { // 5MB limit check
              alert("File is too large. Please upload a file under 5MB.");
              return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
              setSettingsImage(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleAddDept = () => {
      if (newDept && !departments.includes(newDept)) {
          setDepartments([...departments, newDept]);
          setNewDept('');
      }
  };

  const handleRemoveDept = (dept: string) => {
      setDepartments(departments.filter(d => d !== dept));
  };

  const saveSettings = () => {
      db.saveSettings({ 
          waiverText: settingsText, 
          waiverImage: settingsImage,
          departments: departments 
      });
      setShowSettingsModal(false);
  };

  const filteredMembers = members.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(filter.toLowerCase()) || 
                            m.memberNumber.includes(filter) ||
                            m.phoneNumber.includes(filter);
      const matchesArchive = viewArchived ? m.status === 'ARCHIVED' : m.status !== 'ARCHIVED';
      
      return matchesSearch && matchesArchive;
  });

  const getStatusBadge = (member: Member) => {
      if (member.status === 'ARCHIVED') {
          return <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-200 text-gray-600">Archived</span>;
      }

      if (appMode === 'EMPLOYEE') {
          const status = member.lastAction;
          if (status === 'CLOCK_IN' || status === 'BREAK_END') {
              return <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 flex items-center gap-1"><Clock size={12}/> Working</span>
          } else if (status === 'BREAK_START') {
             return <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800 flex items-center gap-1"><Coffee size={12}/> On Break</span>
          } else {
             return <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 flex items-center gap-1"><LogOut size={12}/> Out</span>
          }
      }

      // Membership Mode
      const isExpired = new Date(member.expirationDate) < new Date();
      if (isExpired) {
        return <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Expired</span>
      }
      return <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Active</span>
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {appMode === 'MEMBERSHIP' ? 'Membership Dashboard' : 'Employee Dashboard'}
          </h1>
          <p className="text-gray-500">
             {appMode === 'MEMBERSHIP' ? 'Manage members, renewals, and waivers' : 'Manage employee records and time logs'}
          </p>
        </div>
        
        <div className="flex gap-2">
            <button 
            onClick={() => {
                const settings = db.getSettings();
                setSettingsText(settings.waiverText);
                setSettingsImage(settings.waiverImage);
                setDepartments(settings.departments);
                setShowSettingsModal(true);
            }}
            className="bg-white border border-gray-200 text-gray-600 px-4 py-3 rounded-xl font-semibold shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2"
            >
            <Settings size={20} />
            </button>
            <button 
            onClick={openAddModal}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"
            >
            <Plus size={20} />
            {appMode === 'MEMBERSHIP' ? 'Add Member' : 'Add Employee'}
            </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
            type="text"
            className="block w-full pl-10 pr-3 py-4 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow shadow-sm"
            placeholder="Search by name, ID number, or phone..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            />
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-xl">
            <button 
                onClick={() => setViewArchived(false)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${!viewArchived ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Active Users
            </button>
            <button 
                onClick={() => setViewArchived(true)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewArchived ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Archived
            </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID Number</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {appMode === 'MEMBERSHIP' ? 'Member Name' : 'Employee Name'}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {appMode === 'MEMBERSHIP' ? 'Expiration' : 'Last Activity'}
                </th>
                {appMode === 'MEMBERSHIP' && (
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Waiver</th>
                )}
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                  <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                              <p>Loading members from cloud...</p>
                          </div>
                      </td>
                  </tr>
              ) : filteredMembers.map((member) => (
                  <tr 
                    key={member.id} 
                    onClick={() => setSelectedMember(member)}
                    className="hover:bg-blue-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded group-hover:bg-white transition-colors">
                            {member.memberNumber}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center font-bold transition-colors ${member.status === 'ARCHIVED' ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-600 group-hover:bg-blue-200'}`}>
                          {member.name.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className={`text-sm font-medium ${member.status === 'ARCHIVED' ? 'text-gray-500' : 'text-gray-900'}`}>{member.name}</div>
                          {appMode === 'EMPLOYEE' && member.department && (
                              <div className="text-xs text-gray-400">{member.department}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col text-sm text-gray-500">
                            <span>{member.phoneNumber}</span>
                            <span className="text-xs text-gray-400">{member.email}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(member)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {appMode === 'MEMBERSHIP' ? (
                          <div className="flex items-center gap-2">
                            <Calendar size={14} />
                            {new Date(member.expirationDate).toLocaleDateString()}
                          </div>
                      ) : (
                          <div className="flex items-center gap-2">
                            <Clock size={14} />
                            {member.lastActionTime ? new Date(member.lastActionTime).toLocaleString() : 'N/A'}
                          </div>
                      )}
                    </td>
                    {appMode === 'MEMBERSHIP' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {member.hasWaiver ? (
                                <div className="flex items-center gap-1 text-green-600">
                                    <CheckCircle size={16} /> Signed
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 text-orange-500">
                                    <AlertCircle size={16} /> Pending
                                </div>
                            )}
                        </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                       <ChevronRight className="ml-auto text-gray-300 group-hover:text-blue-500" size={20} />
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          {!isLoading && filteredMembers.length === 0 && (
             <div className="p-12 text-center text-gray-500">
                {viewArchived ? 'No archived records found.' : 'No active records found matching your search.'}
             </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
            {creationStep === 1 ? (
                 <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in duration-200 my-8">
                    <h3 className="text-xl font-bold mb-6 text-gray-900">{appMode === 'MEMBERSHIP' ? 'Add New Member' : 'Add New Employee'}</h3>
                    <form onSubmit={handleNextStep} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Full Name *</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    placeholder="Jane Doe"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    {appMode === 'MEMBERSHIP' ? 'Member ID Number *' : 'Employee ID Number *'}
                                </label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        required 
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-gray-900 bg-white"
                                        value={formData.memberNumber}
                                        onChange={e => setFormData({...formData, memberNumber: e.target.value})}
                                        placeholder="00001"
                                    />
                                    <div className="absolute right-3 top-3 text-xs text-green-600 font-bold">
                                        Auto-Generated
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                                <input 
                                    type="tel" 
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                                    value={formData.phoneNumber}
                                    onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                                    placeholder="555-0100"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                                <input 
                                    type="email" 
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                    placeholder="jane@example.com"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
                                <input 
                                    type="text" 
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                                    value={formData.address}
                                    onChange={e => setFormData({...formData, address: e.target.value})}
                                    placeholder="123 Main St"
                                />
                            </div>
                            
                            {appMode === 'EMPLOYEE' && (
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Department</label>
                                    <select
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
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
                        
                        {formError && (
                            <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-100">
                                {formError}
                            </div>
                        )}

                        <div className="flex gap-3 justify-end pt-4">
                            <button 
                                type="button" 
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                            >
                                {appMode === 'MEMBERSHIP' ? 'Next: Sign Waiver' : 'Create Employee'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="w-full max-w-2xl">
                     <WaiverCanvas 
                        memberName={formData.name} 
                        onSave={handleWaiverSigned}
                        onCancel={() => setCreationStep(1)}
                    />
                </div>
            )}
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95">
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Settings size={24} /> Application Settings
                    </h3>
                  </div>
                  
                  <div className="p-6 overflow-y-auto space-y-6">
                      {/* Waiver Section - Only for MEMBERSHIP mode */}
                      {appMode === 'MEMBERSHIP' && (
                          <div className="space-y-4 pb-6 border-b border-gray-100">
                              <h4 className="font-bold text-gray-800">Liability Waiver Configuration</h4>
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-2">Legal Waiver Text (Required)</label>
                                  <textarea 
                                     className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white text-sm"
                                     value={settingsText}
                                     onChange={e => setSettingsText(e.target.value)}
                                     placeholder="Enter the liability waiver text here..."
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-gray-700 mb-2">Reference Document (Optional)</label>
                                  <div className="flex items-center gap-4">
                                      <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium">
                                          <Upload size={16} /> Upload File (Img/PDF)
                                          <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleImageUpload} />
                                      </label>
                                      {settingsImage && (
                                          <div className="relative group">
                                              {settingsImage.startsWith('data:application/pdf') ? (
                                                  <div className="h-10 w-10 bg-red-50 text-red-600 rounded border border-red-100 flex items-center justify-center" title="PDF Document">
                                                      <FileText size={20} />
                                                  </div>
                                              ) : (
                                                  <img src={settingsImage} alt="Preview" className="h-10 w-10 object-cover rounded border" />
                                              )}
                                              <button 
                                                onClick={() => setSettingsImage(undefined)}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-sm"
                                              >
                                                  <X size={12} />
                                              </button>
                                          </div>
                                      )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-2">
                                      Upload an image or PDF of your physical waiver for reference in the dashboard. Max 5MB.
                                  </p>
                              </div>
                          </div>
                      )}

                      {/* Departments Section - Only for EMPLOYEE mode */}
                      {appMode === 'EMPLOYEE' && (
                          <div className="space-y-4">
                              <h4 className="font-bold text-gray-800">Employee Departments</h4>
                              <div className="flex gap-2">
                                  <input 
                                    type="text" 
                                    className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
                                    placeholder="Add new department..."
                                    value={newDept}
                                    onChange={e => setNewDept(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddDept()}
                                  />
                                  <button 
                                    onClick={handleAddDept}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700"
                                  >
                                      Add
                                  </button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                  {departments.map(dept => (
                                      <div key={dept} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                                          {dept}
                                          <button onClick={() => handleRemoveDept(dept)} className="text-gray-400 hover:text-red-500">
                                              <X size={14} />
                                          </button>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="flex gap-3 justify-end p-6 border-t border-gray-100">
                        <button 
                            type="button" 
                            onClick={() => setShowSettingsModal(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={saveSettings}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                            Save Settings
                        </button>
                    </div>
              </div>
          </div>
      )}

      {/* Member Detail Modal */}
      {selectedMember && (
          <MemberDetailModal 
            member={selectedMember} 
            mode={appMode}
            onClose={() => setSelectedMember(null)}
            onUpdate={async () => {
                await loadMembers();
                // We have to fetch the specific member again to update the modal
                const updated = await db.findMemberById(selectedMember.id);
                if (updated) setSelectedMember(updated);
            }}
          />
      )}
    </div>
  );
};

export default AdminPanel;