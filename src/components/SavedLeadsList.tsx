/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Trash2, 
  Calendar, 
  ArrowUpRight, 
  Phone, 
  Globe, 
  DollarSign, 
  Clipboard,
  Download,
  Upload,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Mail,
  User
} from 'lucide-react';
import { Lead } from '../types';

interface SavedLeadsListProps {
  leads: Lead[];
  completedLeads: Record<string, boolean>;
  onDeleteLead: (placeId: string) => void;
  onSelectLead: (lead: Lead) => void;
  onImportLeads: (imported: Lead[]) => void;
  onToggleCompleted: (placeId: string) => void;
}

export default function SavedLeadsList({ 
  leads,
  completedLeads,
  onDeleteLead, 
  onSelectLead,
  onImportLeads,
  onToggleCompleted,
}: SavedLeadsListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter leads based on search
  const filteredLeads = leads.filter(lead => {
    const query = searchTerm.toLowerCase();
    return (
      lead.name.toLowerCase().includes(query) ||
      (lead.category && lead.category.toLowerCase().includes(query)) ||
      (lead.phone && lead.phone.includes(query)) ||
      (lead.ownerName && lead.ownerName.toLowerCase().includes(query))
    );
  });

  const toggleCompleted = (placeId: string) => {
    onToggleCompleted(placeId);
  };

  // Export leads to JSON file helper
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(leads, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `leads_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import leads from JSON file helper
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            onImportLeads(parsed);
          } else {
            alert("Invalid backup file. Must be a JSON array of leads.");
          }
        } catch (error) {
          alert("Failed to parse the uploaded file.");
        }
      };
    }
  };

  // Calculate quick summary metrics
  const totalLeads = leads.length;
  const averageRate = leads.length 
    ? Math.round(leads.reduce((acc, curr) => acc + (curr.flatRate || 0), 0) / leads.length) 
    : 0;
  const averageHosting = leads.length
    ? Math.round(leads.reduce((acc, curr) => acc + (curr.hostingRate || 0), 0) / leads.length)
    : 0;
  const upcomingFollowups = leads.filter(lead => lead.followUpDate).length;

  return (
    <div id="saved-leads-section" className="space-y-8 max-w-2xl mx-auto pb-24">
      
      {/* Editorial Search & Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-medium text-zinc-900 tracking-tight">Saved Lead Directory</h2>
          <p className="text-xs font-mono text-zinc-400 mt-1 uppercase tracking-wider">
            {totalLeads} saved entries • {upcomingFollowups} scheduled followups
          </p>
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full sm:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 h-3.5 w-3.5" />
          <input
            id="leads-search-input"
            type="text"
            className="w-full bg-white border border-zinc-100 rounded-xl py-2 pl-10 pr-4 text-xs font-sans text-zinc-800 focus:outline-none focus:border-zinc-300 transition-colors placeholder-zinc-400"
            placeholder="Search leads, categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Stats Widgets: ultra-clean JetBrains Mono accents */}
      <div id="leads-stats-row" className="grid grid-cols-3 gap-4 py-4 border-t border-b border-zinc-100">
        <div className="text-center sm:text-left">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Total Leads</span>
          <div className="text-xl font-display font-medium text-zinc-800 mt-1">
            {totalLeads} <span className="text-xs text-zinc-400 font-sans">leads</span>
          </div>
        </div>

        <div className="text-center sm:text-left border-l border-zinc-100 pl-4">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Avg. Proposal</span>
          <div className="text-xl font-display font-medium text-zinc-800 mt-1">
            ${averageRate.toLocaleString()} <span className="text-xs text-zinc-400 font-sans">USD</span>
          </div>
        </div>

        <div className="text-center sm:text-left border-l border-zinc-100 pl-4">
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Avg. Hosting</span>
          <div className="text-xl font-display font-medium text-zinc-800 mt-1">
            ${averageHosting} <span className="text-xs text-zinc-400 font-sans">/ mo</span>
          </div>
        </div>
      </div>

      {/* Main Directory Listing */}
      <div id="leads-list-wrapper" className="space-y-4">
        {filteredLeads.length === 0 ? (
          <div className="text-center py-12 bg-white border border-zinc-100 rounded-2xl">
            <p className="text-sm font-sans text-zinc-400">
              {searchTerm ? "No records matched your search query." : "Your contact directory is currently empty."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {filteredLeads.map((lead) => {
                const uniqueId = lead.placeId || lead.name;
                const isDone = completedLeads[uniqueId] || false;

                return (
                  <motion.div
                    key={uniqueId}
                    id={`lead-card-${uniqueId.replace(/\s+/g, '-')}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={`group bg-white border border-zinc-100 hover:border-zinc-300 rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.005)] transition-all duration-300 ${
                      isDone ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        {/* Elegant Custom Circle Checkbox */}
                        <button
                          id={`checkbox-toggle-${uniqueId.replace(/\s+/g, '-')}`}
                          onClick={() => toggleCompleted(uniqueId)}
                          className="mt-1 flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          <div className={`h-5 w-5 rounded-full border flex items-center justify-center transition-all ${
                            isDone 
                              ? 'bg-zinc-900 border-zinc-900' 
                              : 'border-zinc-300 hover:border-zinc-900 bg-white'
                          }`}>
                            {isDone && <div className="h-2 w-2 rounded-full bg-white animate-scale-in" />}
                          </div>
                        </button>

                        <div>
                          <div className="flex items-center space-x-2.5">
                            <h3 className={`text-base font-display font-medium text-zinc-900 tracking-tight leading-tight ${
                              isDone ? 'line-through text-zinc-400' : ''
                            }`}>
                              {lead.name}
                            </h3>
                            {lead.flatRate !== undefined && (
                              <span className="text-[10px] font-mono text-zinc-400 bg-[#fafaf9] px-1.5 py-0.5 rounded border border-zinc-100 flex items-center gap-1.5">
                                <span>Flat: ${lead.flatRate}</span>
                                {lead.hostingRate !== undefined && (
                                  <>
                                    <span className="opacity-40">•</span>
                                    <span>Host: ${lead.hostingRate}/mo</span>
                                  </>
                                )}
                                {lead.firstMonthFree && (
                                  <>
                                    <span className="opacity-40">•</span>
                                    <span>1st mo free</span>
                                  </>
                                )}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-mono text-zinc-400 uppercase mt-0.5">{lead.category}</p>
                        </div>
                      </div>

                      {/* Quiet Actions on Hover */}
                      <div className="flex items-center space-x-2 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          id={`btn-load-lead-${uniqueId.replace(/\s+/g, '-')}`}
                          onClick={() => onSelectLead(lead)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 transition-all text-xs font-sans flex items-center space-x-1"
                          title="Open in Workspace"
                        >
                          <span>Open Workspace</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                        
                        <button
                          id={`btn-delete-lead-${uniqueId.replace(/\s+/g, '-')}`}
                          onClick={() => onDeleteLead(uniqueId)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all"
                          title="Delete record"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </div>

                    {/* Nested, Indented details with very thin vertical separator as specified */}
                    <div className="mt-4 pl-9 ml-2.5 border-l border-zinc-100 space-y-3 font-sans text-xs text-zinc-500">
                      {lead.ownerName && (
                        <div className="flex items-center space-x-2">
                          <User className="h-3.5 w-3.5 text-zinc-400" />
                          <span className="font-medium text-zinc-700">Owner: {lead.ownerName}</span>
                        </div>
                      )}

                      {lead.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-3.5 w-3.5 text-zinc-400" />
                          <span>{lead.phone}</span>
                        </div>
                      )}

                      {lead.email && (
                        <div className="flex items-center space-x-2">
                          <Mail className="h-3.5 w-3.5 text-zinc-400" />
                          <a href={`mailto:${lead.email}`} className="hover:text-zinc-900 hover:underline">{lead.email}</a>
                        </div>
                      )}

                      {lead.website && (
                        <div className="flex items-center space-x-2">
                          <Globe className="h-3.5 w-3.5 text-zinc-400" />
                          <a 
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="hover:text-zinc-900 hover:underline"
                          >
                            {lead.website}
                          </a>
                        </div>
                      )}

                      {lead.nextSteps && (
                        <div className="bg-[#fafaf9] rounded-lg p-2.5 border border-zinc-50 mt-1 max-w-md">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">Notes / Action Plan</span>
                          <p className="text-zinc-600 italic leading-relaxed">{lead.nextSteps}</p>
                        </div>
                      )}

                      {lead.followUpDate && (
                        <div className="flex items-center space-x-2 text-zinc-700 bg-zinc-50 px-2.5 py-1.5 rounded-lg w-max border border-zinc-100">
                          <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                          <span className="font-mono text-[11px] font-medium">
                            Follow-up: {lead.followUpDate} at {lead.followUpTime || '16:30'}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Backup and Restore Utilities: elegant minimalist styling */}
      <div id="backup-restore-box" className="pt-8 border-t border-zinc-100 flex items-center justify-between">
        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Directory Maintenance</span>
        <div className="flex items-center space-x-4">
          <button
            id="btn-export-backup"
            onClick={handleExport}
            className="text-xs font-mono text-zinc-500 hover:text-zinc-900 transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Backup</span>
          </button>

          <label className="text-xs font-mono text-zinc-500 hover:text-zinc-900 transition-colors flex items-center space-x-1.5 cursor-pointer">
            <Upload className="h-3.5 w-3.5" />
            <span>Import Backup</span>
            <input
              id="import-backup-file"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
