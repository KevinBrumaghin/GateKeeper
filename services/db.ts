import { Member, EmployeeAction, TimeLog, AuditLogEntry, AppSettings } from '../types';
import { supabase } from './supabase';

const STORAGE_KEY = 'gatekeeper_members_v1';
const TIMELOG_KEY = 'gatekeeper_timelogs_v1';
const SETTINGS_KEY = 'gatekeeper_settings_v1';

const DEFAULT_WAIVER_TEXT = "I hereby assume all risks associated with my participation in activities at this facility. I release the business, its owners, and employees from all liability for injury, death, or property loss.";
const DEFAULT_DEPARTMENTS = ['Sales', 'Operations', 'Management', 'Trainer', 'Front Desk'];

// === MAPPERS ===
// Convert DB (snake_case) to App (camelCase)
const mapMemberFromDB = (row: any): Member => ({
    id: row.id,
    organizationId: row.organization_id,
    memberNumber: row.member_number,
    name: row.name,
    phoneNumber: row.phone_number,
    email: row.email,
    address: row.address,
    department: row.department,
    expirationDate: row.expiration_date,
    hasWaiver: row.has_waiver,
    waiverSignature: row.waiver_signature,
    joinedDate: row.joined_date,
    status: row.status as 'ACTIVE' | 'ARCHIVED',
    lastAction: row.last_action,
    lastActionTime: row.last_action_time,
    auditLogs: row.audit_logs || [] // JSONB column
});

// Convert App (camelCase) to DB (snake_case)
const mapMemberToDB = (member: Partial<Member>) => {
    const payload: any = {};
    if (member.memberNumber !== undefined) payload.member_number = member.memberNumber;
    if (member.name !== undefined) payload.name = member.name;
    if (member.phoneNumber !== undefined) payload.phone_number = member.phoneNumber;
    if (member.email !== undefined) payload.email = member.email;
    if (member.address !== undefined) payload.address = member.address;
    if (member.department !== undefined) payload.department = member.department;
    if (member.expirationDate !== undefined) payload.expiration_date = member.expirationDate;
    if (member.hasWaiver !== undefined) payload.has_waiver = member.hasWaiver;
    if (member.waiverSignature !== undefined) payload.waiver_signature = member.waiverSignature;
    if (member.status !== undefined) payload.status = member.status;
    if (member.lastAction !== undefined) payload.last_action = member.lastAction;
    if (member.lastActionTime !== undefined) payload.last_action_time = member.lastActionTime;
    if (member.auditLogs !== undefined) payload.audit_logs = member.auditLogs;
    return payload;
};

// Helper to get current User ID (Organization ID)
const getOrgId = async () => {
    // Try to get user from active session
    const { data } = await supabase.auth.getUser();
    if (data.user) return data.user.id;

    // Fallback: Check if session exists but user call failed (sometimes faster)
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.user?.id;
};

export const db = {
  getMembers: async (): Promise<Member[]> => {
    const orgId = await getOrgId();
    if (!orgId) return []; 

    const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('organization_id', orgId);

    if (error) {
        console.error('Error fetching members:', error);
        return [];
    }
    return data.map(mapMemberFromDB);
  },

  getSettings: (): AppSettings => {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (!data) {
          return { 
              waiverText: DEFAULT_WAIVER_TEXT,
              departments: DEFAULT_DEPARTMENTS 
          };
      }
      const parsed = JSON.parse(data);
      if (!parsed.departments) parsed.departments = DEFAULT_DEPARTMENTS;
      return parsed;
  },

  saveSettings: (settings: AppSettings) => {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },

  getNextMemberId: async (): Promise<string> => {
      const members = await db.getMembers();
      if (members.length === 0) return '00001';
      
      const ids = members
        .map(m => parseInt(m.memberNumber, 10))
        .filter(n => !isNaN(n));
      
      const maxId = ids.length > 0 ? Math.max(...ids) : 0;
      return (maxId + 1).toString().padStart(5, '0');
  },

  findMemberByNumber: async (number: string): Promise<Member | undefined> => {
    const orgId = await getOrgId();
    if (!orgId) return undefined;

    const { data } = await supabase
        .from('members')
        .select('*')
        .eq('organization_id', orgId)
        .eq('member_number', number)
        .neq('status', 'ARCHIVED')
        .maybeSingle(); 

    return data ? mapMemberFromDB(data) : undefined;
  },

  createMember: async (data: Partial<Member>): Promise<Member | null> => {
    const orgId = await getOrgId();
    if (!orgId) throw new Error("Not authenticated");

    const nextId = await db.getNextMemberId();
    const finalId = data.memberNumber || nextId;

    const newMemberPayload = {
        organization_id: orgId,
        member_number: finalId,
        name: data.name || 'Unknown',
        phone_number: data.phoneNumber || '',
        email: data.email || '',
        address: data.address || '',
        department: data.department || '',
        expiration_date: new Date(Date.now() + 86400000 * 30).toISOString(),
        has_waiver: data.hasWaiver || false,
        waiver_signature: data.waiverSignature || null,
        joined_date: new Date().toISOString(),
        status: 'ACTIVE',
        audit_logs: []
    };

    const { data: created, error } = await supabase
        .from('members')
        .insert(newMemberPayload)
        .select()
        .single();

    if (error) {
        console.error("Create error", error);
        throw error; // Throw so UI can catch it
    }
    return mapMemberFromDB(created);
  },

  updateMember: async (updatedMember: Member): Promise<void> => {
    const payload = mapMemberToDB(updatedMember);
    await supabase
        .from('members')
        .update(payload)
        .eq('id', updatedMember.id);
  },

  archiveMember: async (id: string): Promise<void> => {
    const { data: current } = await supabase.from('members').select('audit_logs').eq('id', id).single();
    const currentLogs = current?.audit_logs || [];
    
    const newLog = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        action: 'ARCHIVE',
        details: 'User archived by Admin',
        adminUser: 'Admin'
    };

    await supabase
        .from('members')
        .update({ 
            status: 'ARCHIVED',
            audit_logs: [...currentLogs, newLog]
        })
        .eq('id', id);
  },
 
  getTimeLogs: async (): Promise<TimeLog[]> => {
      const orgId = await getOrgId();
      if (!orgId) return [];

      const { data } = await supabase.from('time_logs').select('*').eq('organization_id', orgId);
      return (data || []).map((row: any) => ({
          id: row.id,
          organizationId: row.organization_id,
          memberId: row.member_id,
          action: row.action,
          timestamp: row.timestamp,
          isEdited: row.is_edited,
          originalTimestamp: row.original_timestamp
      }));
  },

  getMemberTimeLogs: async (memberId: string): Promise<TimeLog[]> => {
      const orgId = await getOrgId();
      if (!orgId) return [];
      
      const { data } = await supabase
        .from('time_logs')
        .select('*')
        .eq('organization_id', orgId)
        .eq('member_id', memberId)
        .order('timestamp', { ascending: false });

      return (data || []).map((row: any) => ({
        id: row.id,
        organizationId: row.organization_id,
        memberId: row.member_id,
        action: row.action,
        timestamp: row.timestamp,
        isEdited: row.is_edited,
        originalTimestamp: row.original_timestamp
    }));
  },

  logTime: async (memberId: string, action: EmployeeAction): Promise<Member | null> => {
      const orgId = await getOrgId();
      if (!orgId) return null;
      
      const timestamp = new Date().toISOString();

      await supabase.from('time_logs').insert({
          organization_id: orgId,
          member_id: memberId,
          action: action,
          timestamp: timestamp
      });

      await supabase.from('members').update({
          last_action: action,
          last_action_time: timestamp
      }).eq('id', memberId);

      return db.findMemberByNumber((await db.findMemberById(memberId))?.memberNumber || '');
  },

  findMemberById: async (id: string): Promise<Member | undefined> => {
      const { data } = await supabase.from('members').select('*').eq('id', id).single();
      return data ? mapMemberFromDB(data) : undefined;
  },

  addManualTimeLog: async (memberId: string, timestamp: string, action: EmployeeAction, adminName: string): Promise<void> => {
      const orgId = await getOrgId();
      if (!orgId) return;

      await supabase.from('time_logs').insert({
          organization_id: orgId,
          member_id: memberId,
          action: action,
          timestamp: timestamp,
          is_edited: true
      });

      const { data: current } = await supabase.from('members').select('audit_logs, last_action_time').eq('id', memberId).single();
      const currentLogs = current?.audit_logs || [];
      
      const newLog = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        action: 'ADD_TIME_LOG',
        details: `Manually added log: ${new Date(timestamp).toLocaleString()} (${action})`,
        adminUser: adminName
      };

      const updates: any = { audit_logs: [...currentLogs, newLog] };
      
      if (!current?.last_action_time || new Date(timestamp) > new Date(current.last_action_time)) {
          updates.last_action = action;
          updates.last_action_time = timestamp;
      }

      await supabase.from('members').update(updates).eq('id', memberId);
  },

  updateTimeLog: async (logId: string, newTimestamp: string, newAction: EmployeeAction, adminName: string): Promise<void> => {
      const { data: oldLog } = await supabase.from('time_logs').select('*').eq('id', logId).single();
      if (!oldLog) return;

      await supabase.from('time_logs').update({
          timestamp: newTimestamp,
          action: newAction,
          is_edited: true,
          original_timestamp: oldLog.original_timestamp || oldLog.timestamp
      }).eq('id', logId);

      const { data: member } = await supabase.from('members').select('audit_logs').eq('id', oldLog.member_id).single();
      const currentLogs = member?.audit_logs || [];
      const newAudit = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          action: 'EDIT_TIME_LOG',
          details: `Edited log: ${new Date(oldLog.timestamp).toLocaleString()} -> ${new Date(newTimestamp).toLocaleString()}`,
          adminUser: adminName
      };
      await supabase.from('members').update({ audit_logs: [...currentLogs, newAudit] }).eq('id', oldLog.member_id);
  },

  saveWaiver: async (id: string, signatureBase64: string): Promise<Member | null> => {
      const { data, error } = await supabase
        .from('members')
        .update({ 
            has_waiver: true, 
            waiver_signature: signatureBase64 
        })
        .eq('id', id)
        .select()
        .single();
        
      return data ? mapMemberFromDB(data) : null;
  }
};