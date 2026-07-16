/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Upload, 
  Download, 
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { Lead, ViewMode } from './types';
import LeadProcessor from './components/LeadProcessor';
import SavedLeadsList from './components/SavedLeadsList';
import LoginGate from './components/LoginGate';
import {
  fetchAppData,
  saveLead,
  removeLead,
  importLeadsApi,
  toggleProgress,
  fetchAuthStatus,
  logout,
} from './api';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('process');
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [savedLeads, setSavedLeads] = useState<Lead[]>([]);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [completedLeads, setCompletedLeads] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const applyData = (data: { leads: Lead[]; completed: Record<string, boolean> }) => {
    setSavedLeads(data.leads || []);
    setCompletedLeads(data.completed || {});
  };

  const loadDirectory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAppData();

      if ((!data.leads || data.leads.length === 0)) {
        const local = localStorage.getItem('lead_processor_saved_leads');
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const migrated = await importLeadsApi(parsed);
              applyData(migrated);
              localStorage.removeItem('lead_processor_saved_leads');
              return;
            }
          } catch (e) {
            console.error('Failed to migrate localStorage leads:', e);
          }
        }
      }

      applyData(data);
    } catch (e: any) {
      if (e?.authRequired) {
        setAuthenticated(false);
      } else {
        console.error('Failed to load leads from server:', e);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const status = await fetchAuthStatus();
        if (cancelled) return;
        const ok = !status.configured || status.authenticated;
        setAuthenticated(ok);
        setAuthChecked(true);
        if (ok) await loadDirectory();
        else setLoading(false);
      } catch (e) {
        console.error('Failed to check auth status:', e);
        if (!cancelled) {
          setAuthChecked(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadDirectory]);

  const handleLoginSuccess = async () => {
    setAuthenticated(true);
    await loadDirectory();
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error('Failed to logout:', e);
    }
    setAuthenticated(false);
    setSavedLeads([]);
    setCompletedLeads({});
    setActiveLead(null);
  };

  const handleSaveLead = async (lead: Lead) => {
    try {
      const data = await saveLead(lead);
      applyData(data);
    } catch (e) {
      console.error('Failed to save lead:', e);
      alert('Failed to save lead. Check the server connection.');
    }
  };

  const handleDeleteLead = async (placeIdOrName: string) => {
    try {
      const data = await removeLead(placeIdOrName);
      applyData(data);
      if (activeLead && (activeLead.placeId === placeIdOrName || activeLead.name === placeIdOrName)) {
        setActiveLead(null);
      }
    } catch (e) {
      console.error('Failed to delete lead:', e);
      alert('Failed to delete lead. Check the server connection.');
    }
  };

  const handleSelectLead = (lead: Lead) => {
    setActiveLead(lead);
    setViewMode('process');
  };

  const handleImportLeads = async (imported: Lead[]) => {
    try {
      const data = await importLeadsApi(imported);
      applyData(data);
    } catch (e) {
      console.error('Failed to import leads:', e);
      alert('Failed to import leads. Check the server connection.');
    }
  };

  const filteredSidebarLeads = savedLeads.filter(lead => {
    const q = sidebarSearch.toLowerCase();
    return (
      lead.name.toLowerCase().includes(q) ||
      (lead.category && lead.category.toLowerCase().includes(q)) ||
      (lead.ownerName && lead.ownerName.toLowerCase().includes(q))
    );
  });

  const toggleLeadProgress = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const data = await toggleProgress(id);
      applyData(data);
    } catch (err) {
      console.error('Failed to toggle progress:', err);
    }
  };

  const handleExportBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedLeads, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `leads_directory_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            handleImportLeads(parsed);
          } else {
            alert("Invalid backup format. Must be a JSON list of leads.");
          }
        } catch (error) {
          alert("Failed to parse directory file.");
        }
      };
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center text-xs font-mono text-zinc-400">
        Loading…
      </div>
    );
  }

  if (!authenticated) {
    return <LoginGate onSuccess={handleLoginSuccess} />;
  }

  return (
    <div id="root-app-layout" className="min-h-screen bg-[#fafaf9] text-zinc-900 font-sans antialiased flex flex-col md:flex-row">
      
      {/* 1. Left Persistent Navigation Sidebar Menu */}
      <aside 
        id="app-sidebar-menu" 
        className="w-full md:w-80 shrink-0 bg-white border-b md:border-b-0 md:border-r border-zinc-100 flex flex-col h-auto md:h-screen md:sticky md:top-0"
      >
        {/* Brand identity block */}
        <div className="p-6 border-b border-zinc-100 shrink-0">
          <div className="flex items-center space-x-2.5 mb-2">
            <span className="text-[10px] font-mono bg-zinc-900 text-[#fafaf9] px-2 py-0.5 rounded uppercase tracking-wider font-semibold">CRM Workspace</span>
            <span className="text-[10px] font-mono text-zinc-400">v1.2.0</span>
          </div>
          <h1 className="text-xl font-display font-semibold tracking-tight text-zinc-900">
            Lead Processor
          </h1>
          <p className="text-xs text-zinc-400 font-sans mt-0.5">
            Website proposal directory and calling desk.
          </p>
        </div>

        {/* Sidebar Actions Area */}
        <div className="p-4 border-b border-zinc-50 shrink-0 space-y-3">
          {/* Paste New Lead Button */}
          <button
            id="sidebar-btn-new-lead"
            onClick={() => {
              setActiveLead(null);
              setViewMode('process');
            }}
            className="w-full inline-flex items-center justify-center space-x-2 bg-zinc-900 hover:bg-zinc-800 text-[#fafaf9] text-xs font-sans py-2.5 px-4 rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Process New Lead (CSV)</span>
          </button>

          {/* Quick Filter Search in Sidebar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 h-3.5 w-3.5" />
            <input
              id="sidebar-search-input"
              type="text"
              placeholder="Search directory..."
              className="w-full bg-[#fafaf9] border border-zinc-100 rounded-xl py-1.5 pl-9 pr-3 text-xs font-sans text-zinc-800 focus:outline-none focus:border-zinc-300 transition-colors placeholder-zinc-400"
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Interactive Leads Navigation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 max-h-[300px] md:max-h-none">
          <div className="px-3 py-1.5 flex justify-between items-center">
            <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider">SAVED CONTACTS ({savedLeads.length})</span>
            <button 
              id="sidebar-btn-full-directory"
              onClick={() => setViewMode('list')}
              className={`text-[9px] font-mono uppercase tracking-wider underline hover:text-zinc-900 ${viewMode === 'list' ? 'text-zinc-900 font-bold' : 'text-zinc-400'}`}
            >
              Full Stats View
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 px-4 text-xs font-sans text-zinc-400 italic">
              Loading directory...
            </div>
          ) : filteredSidebarLeads.length === 0 ? (
            <div className="text-center py-8 px-4 text-xs font-sans text-zinc-400 italic">
              {sidebarSearch ? 'No matches found' : 'No saved lead profiles yet'}
            </div>
          ) : (
            filteredSidebarLeads.map((lead) => {
              const leadId = lead.placeId || lead.name;
              const isActive = activeLead && (activeLead.placeId === lead.placeId || activeLead.name === lead.name);
              const isTicked = completedLeads[leadId] || false;

              return (
                <div
                  key={leadId}
                  id={`sidebar-lead-${leadId.replace(/\s+/g, '-')}`}
                  onClick={() => handleSelectLead(lead)}
                  className={`group w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? 'bg-zinc-100/80 shadow-[inset_0_1px_1px_rgba(0,0,0,0.02)]' 
                      : 'hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    {/* Circle checkbox inside list item */}
                    <button
                      id={`sidebar-check-${leadId.replace(/\s+/g, '-')}`}
                      onClick={(e) => toggleLeadProgress(leadId, e)}
                      className="shrink-0 focus:outline-none"
                    >
                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center transition-all ${
                        isTicked 
                          ? 'bg-zinc-900 border-zinc-900' 
                          : 'border-zinc-300 hover:border-zinc-700 bg-white'
                      }`}>
                        {isTicked && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </button>

                    <div className="truncate">
                      <span className={`text-xs font-display font-medium text-zinc-900 block truncate ${isTicked ? 'line-through text-zinc-400' : ''}`}>
                        {lead.name}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-tight block">
                        {lead.category} • Flat: ${lead.flatRate || 750}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className={`h-3 w-3 text-zinc-400 transition-transform ${isActive ? 'translate-x-0.5 text-zinc-900' : 'opacity-0 group-hover:opacity-100'}`} />
                </div>
              );
            })
          )}
        </div>

        {/* Quiet Backup Utilities in Sidebar Footer */}
        <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 shrink-0 flex items-center justify-between text-[10px] font-mono text-zinc-400">
          <button
            id="sidebar-btn-export"
            onClick={handleExportBackup}
            className="hover:text-zinc-900 flex items-center space-x-1 cursor-pointer"
            title="Export contacts"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </button>

          <label className="hover:text-zinc-900 flex items-center space-x-1 cursor-pointer">
            <Upload className="h-3.5 w-3.5" />
            <span>Import</span>
            <input
              id="sidebar-import-file"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportBackup}
            />
          </label>

          <button
            id="sidebar-btn-logout"
            onClick={handleLogout}
            className="hover:text-zinc-900 flex items-center space-x-1 cursor-pointer"
            title="Lock workspace"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Lock</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Workspace Right Panel */}
      <main id="app-main-workspace" className="flex-1 overflow-y-auto px-6 py-12 md:px-12 md:py-16">
        <div className="max-w-2xl mx-auto space-y-8">
          
          <AnimatePresence mode="wait">
            {viewMode === 'process' ? (
              <motion.div
                key="workspace-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <LeadProcessor
                  onSaveLead={handleSaveLead}
                  activeLead={activeLead}
                  setActiveLead={setActiveLead}
                  onNavigateToBook={() => setViewMode('list')}
                />
              </motion.div>
            ) : (
              <motion.div
                key="directory-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                {/* Embedded Directory Page with custom header */}
                <div className="mb-6 flex justify-between items-center">
                  <button
                    id="btn-back-to-workspace"
                    onClick={() => setViewMode('process')}
                    className="text-xs font-mono text-zinc-400 hover:text-zinc-900 flex items-center space-x-1"
                  >
                    <span>← Go to Workspace</span>
                  </button>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Full Directory Dashboard</span>
                </div>
                
                <SavedLeadsList
                  leads={savedLeads}
                  completedLeads={completedLeads}
                  onDeleteLead={handleDeleteLead}
                  onSelectLead={handleSelectLead}
                  onImportLeads={handleImportLeads}
                  onToggleCompleted={(id) => {
                    toggleProgress(id).then(applyData).catch((err) => {
                      console.error('Failed to toggle progress:', err);
                    });
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quiet elegant footer accent inside main workspace */}
          <footer id="workspace-footer" className="pt-8 border-t border-zinc-100 text-center text-[9px] font-mono text-zinc-400 tracking-wider">
            PREMIUM DIGITAL DEVELOPMENT PLATFORM • HIGH-FIDELITY CRM SYSTEM
          </footer>
        </div>
      </main>

    </div>
  );
}
