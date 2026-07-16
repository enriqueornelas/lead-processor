/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, 
  MapPin, 
  Globe, 
  Star, 
  Calendar, 
  Clock, 
  ArrowRight, 
  AlertCircle,
  DollarSign,
  Plus,
  Mic,
  Square,
  Play,
  Download,
  Check,
  RefreshCw,
  Video,
  Mail,
  User,
  Copy,
  ClipboardCheck
} from 'lucide-react';
import { Lead } from '../types';
import { parseLeadCSV } from '../utils/csvParser';

interface LeadProcessorProps {
  onSaveLead: (lead: Lead) => void;
  activeLead: Lead | null;
  setActiveLead: (lead: Lead | null) => void;
  onNavigateToBook: () => void;
}

const DEFAULT_FOLLOW_UP_TIME = '16:30';

function defaultFollowUpDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function LeadProcessor({ 
  onSaveLead, 
  activeLead, 
  setActiveLead, 
  onNavigateToBook 
}: LeadProcessorProps) {
  const [csvInput, setCsvInput] = useState('');
  const [parseError, setParseError] = useState('');
  
  // Lead custom configurations
  const [flatRate, setFlatRate] = useState('750');
  const [hostingRate, setHostingRate] = useState('25');
  const [firstMonthFree, setFirstMonthFree] = useState(false);
  const [outcomeEmail, setOutcomeEmail] = useState('');
  const [outcomePhone, setOutcomePhone] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [followUpDate, setFollowUpDate] = useState(defaultFollowUpDate);
  const [followUpTime, setFollowUpTime] = useState(DEFAULT_FOLLOW_UP_TIME);
  
  // Progress states
  const [progressPercent, setProgressPercent] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [summaryCopied, setSummaryCopied] = useState(false);

  // Call Recording state variables
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Parse CSV when input changes
  const handleParse = (text: string) => {
    if (!text.trim()) {
      setParseError('');
      return;
    }
    const parsed = parseLeadCSV(text);
    if (parsed) {
      setParseError('');
      setActiveLead(parsed);
      // Reset state for new lead
      setFlatRate('750');
      setHostingRate('25');
      setFirstMonthFree(false);
      setOutcomeEmail('');
      setOutcomePhone(parsed.phone || '');
      setOwnerName('');
      setNextSteps('');
      setFollowUpDate(defaultFollowUpDate());
      setFollowUpTime(DEFAULT_FOLLOW_UP_TIME);
      setSummaryCopied(false);
      // Reset recording state
      resetRecording();
    } else {
      setParseError('Unable to parse CSV. Please verify the format matches the sample below.');
    }
  };

  // Sync state if activeLead is loaded from outside (e.g. from Saved Book)
  useEffect(() => {
    if (activeLead) {
      setFlatRate(String(activeLead.flatRate ?? 750));
      setHostingRate(String(activeLead.hostingRate ?? 25));
      setFirstMonthFree(!!activeLead.firstMonthFree);
      setOutcomeEmail(activeLead.email || '');
      setOutcomePhone(activeLead.phone || '');
      setOwnerName(activeLead.ownerName || '');
      setNextSteps(activeLead.nextSteps || '');
      setFollowUpDate(activeLead.followUpDate || defaultFollowUpDate());
      setFollowUpTime(activeLead.followUpTime || DEFAULT_FOLLOW_UP_TIME);
      setSummaryCopied(false);
      setCsvInput('');
      resetRecording();
    }
  }, [activeLead]);

  // Clean up recording timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Call Recording Start / Stop / Reset Handlers
  const startRecording = async () => {
    try {
      setAudioUrl(null);
      setRecordedBlob(null);
      audioChunksRef.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
        
        // Stop all tracks to release hardware light
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied or not available:", err);
      alert("Microphone permission denied or not available. Please allow microphone access to record call sessions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resetRecording = () => {
    setIsRecording(false);
    setRecordingDuration(0);
    setAudioUrl(null);
    setRecordedBlob(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const downloadRecording = () => {
    if (!recordedBlob || !activeLead) return;
    const sanitizedName = activeLead.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Call_Record_${sanitizedName}_${dateStr}.webm`;
    
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getFirstName = () => {
    const trimmed = ownerName.trim();
    if (!trimmed) return '';
    return trimmed.split(/\s+/)[0];
  };

  const formatMeetingDate = (dateStr: string) => {
    if (!dateStr) return 'TBD';
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatMeetingTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10) || 0;
    if (Number.isNaN(h)) return timeStr;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  };

  const buildClientSummary = () => {
    if (!activeLead) return '';
    const firstName = getFirstName();
    const greeting = firstName ? `Hey ${firstName}` : 'Hey';
    const meetingDate = formatMeetingDate(followUpDate);
    const meetingTime = formatMeetingTime(followUpTime);
    const whenLine = meetingTime
      ? `${meetingDate} at ${meetingTime}`
      : meetingDate;

    const hostingLine = firstMonthFree
      ? `Monthly hosting: $${hostingRate}/mo (first month free)`
      : `Monthly hosting: $${hostingRate}/mo`;

    const lines = [
      `${greeting}, thank you so much for meeting with me today.`,
      '',
      `Just letting you know that we have our follow-up meeting set up for ${whenLine}.`,
      '',
      `Here's a quick summary of what we discussed for ${activeLead.name}:`,
      `• Website build: $${flatRate} flat rate`,
      `• ${hostingLine}`,
    ];

    if (nextSteps.trim()) {
      lines.push('');
      lines.push(`Next steps: ${nextSteps.trim()}`);
    }

    lines.push('');
    lines.push('Looking forward to chatting again. Feel free to reach out if you have any questions before then!');

    return lines.join('\n');
  };

  const handleCopySummary = async () => {
    const summary = buildClientSummary();
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setSummaryCopied(true);
      setTimeout(() => setSummaryCopied(false), 2500);
    } catch {
      // Fallback for older browsers / denied clipboard permission
      const textarea = document.createElement('textarea');
      textarea.value = summary;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setSummaryCopied(true);
      setTimeout(() => setSummaryCopied(false), 2500);
    }
  };

  // Generate Google Calendar Link ready to open in new tab
  const getGoogleCalendarUrl = () => {
    if (!activeLead) return '';
    const title = encodeURIComponent(`Web Pitch Follow-Up: ${activeLead.name}`);
    
    const dateFormatted = followUpDate ? followUpDate.replace(/-/g, '') : '';
    const timeFormatted = followUpTime ? followUpTime.replace(/:/g, '') + '00' : '163000';
    
    let startDateTime = `${dateFormatted}T${timeFormatted}`;
    
    // Add 30 mins for end time
    let endHour = parseInt(followUpTime.split(':')[0], 10) || 16;
    let endMin = (parseInt(followUpTime.split(':')[1], 10) || 0) + 30;
    if (endMin >= 60) {
      endHour += 1;
      endMin -= 60;
    }
    const endHourStr = String(endHour).padStart(2, '0');
    const endMinStr = String(endMin).padStart(2, '0');
    let endDateTime = `${dateFormatted}T${endHourStr}${endMinStr}00`;

    const datesParam = dateFormatted ? `&dates=${startDateTime}/${endDateTime}` : '';
    
    const hostingDetail = firstMonthFree
      ? `Hosting Rate Offered: $${hostingRate}/mo (first month free)\n`
      : `Hosting Rate Offered: $${hostingRate}/mo\n`;

    const details = encodeURIComponent(
      `Business: ${activeLead.name}\n` +
      `Category: ${activeLead.category}\n` +
      `Owner Name: ${ownerName || 'N/A'}\n` +
      `Phone: ${outcomePhone || 'N/A'}\n` +
      `Email: ${outcomeEmail || 'N/A'}\n` +
      `Maps: ${activeLead.mapsUrl || 'N/A'}\n` +
      `Flat Rate Offered: $${flatRate}\n` +
      hostingDetail +
      `\nCall Notes / Next Steps:\n${nextSteps || 'No custom notes provided.'}`
    );

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}${datesParam}&details=${details}&sf=true&output=xml`;
  };

  // Handle saving lead
  const handleSave = () => {
    if (!activeLead) return;
    
    // Trigger progress animation
    setProgressPercent(30);
    const interval = setInterval(() => {
      setProgressPercent((p) => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 35;
      });
    }, 100);

    setTimeout(() => {
      const leadToSave: Lead = {
        ...activeLead,
        flatRate: Number(flatRate) || 0,
        hostingRate: Number(hostingRate) || 0,
        firstMonthFree,
        phone: outcomePhone,
        email: outcomeEmail,
        ownerName,
        nextSteps,
        followUpDate,
        followUpTime,
        savedAt: new Date().toISOString()
      };
      onSaveLead(leadToSave);
      setSaveSuccess(true);
      setProgressPercent(0);

      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    }, 450);
  };

  // Standard CSV example
  const sampleCSV = `Davila's junk Removal and hauling,junk removal,"719 Leal St, San Antonio, TX 78207, USA",(305) 519-9140,,https://maps.google.com/?cid=11562860352917476300,4.8,9,OPERATIONAL,Services,no,new,no`;

  return (
    <div id="lead-processor-container" className="space-y-8 max-w-2xl mx-auto pb-16">
      
      {/* Thin Micro Progress Bar */}
      {progressPercent > 0 && (
        <div className="fixed top-0 left-0 right-0 h-[2px] bg-zinc-100 z-50">
          <motion.div 
            className="h-full bg-zinc-900" 
            initial={{ width: '0%' }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ ease: "easeOut", duration: 0.2 }}
          />
        </div>
      )}

      {/* CSV Paste Area (Visible if no active lead, or user wants to paste new) */}
      {!activeLead ? (
        <motion.div 
          id="csv-input-card"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-zinc-100 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.01)] transition-all duration-300"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="h-2 w-2 rounded-full bg-zinc-400" />
            <h2 className="text-xl font-display font-medium text-zinc-900 tracking-tight">Process a New Lead</h2>
          </div>
          
          <p className="text-sm text-zinc-500 font-sans leading-relaxed mb-6">
            Paste a row of CSV lead data below. We'll parse the company info, website status, rating, and location, then generate a lightweight sales workspace.
          </p>

          <div className="space-y-4">
            <textarea
              id="csv-textarea"
              rows={4}
              className="w-full bg-[#fafaf9] border border-zinc-100 rounded-xl p-4 text-sm font-mono text-zinc-700 focus:outline-none focus:border-zinc-300 transition-colors placeholder-zinc-400 resize-none"
              placeholder="Paste lead CSV row here..."
              value={csvInput}
              onChange={(e) => {
                setCsvInput(e.target.value);
                handleParse(e.target.value);
              }}
            />

            {parseError && (
              <div id="parse-error-box" className="flex items-start space-x-2 text-xs text-red-500 font-sans mt-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}

            <div className="pt-4 border-t border-zinc-50">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-2">Example Format</span>
              <div className="bg-[#fafaf9] border border-zinc-100 rounded-lg p-3 text-[11px] font-mono text-zinc-500 overflow-x-auto whitespace-pre">
                {sampleCSV}
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        /* Expanded Active Lead View */
        <motion.div 
          id="active-lead-workspace"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          {/* Back Action / Clear Lead */}
          <div className="flex justify-between items-center px-1">
            <button 
              id="btn-back-to-paste"
              onClick={() => {
                setActiveLead(null);
                resetRecording();
              }}
              className="group text-xs font-mono text-zinc-400 hover:text-zinc-950 transition-colors flex items-center space-x-1"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180 transition-transform group-hover:-translate-x-0.5" />
              <span>Paste New CSV</span>
            </button>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-semibold">Active workspace</span>
          </div>

          {/* Card 1: Lead Information */}
          <div id="lead-info-card" className="bg-white border border-zinc-100 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
            <div className="flex justify-between items-start gap-4 mb-6">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                  {activeLead.category || 'Business'}
                </span>
                <h1 className="text-2xl font-display font-semibold text-zinc-900 tracking-tight leading-tight">
                  {activeLead.name}
                </h1>
              </div>

              {activeLead.rating > 0 && (
                <div className="flex items-center space-x-1.5 bg-[#fafaf9] px-2.5 py-1 rounded-full border border-zinc-100">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-mono font-medium text-zinc-800">{activeLead.rating}</span>
                  <span className="text-[10px] text-zinc-400 font-sans">({activeLead.reviewCount})</span>
                </div>
              )}
            </div>

            {/* Flat Nested List Layout as specified */}
            <div className="space-y-4 font-sans text-sm text-zinc-600 border-l border-zinc-100 pl-4 ml-1">
              {activeLead.phone && (
                <div className="flex items-center space-x-3 group">
                  <Phone className="h-4 w-4 text-zinc-400 group-hover:text-zinc-800 transition-colors" />
                  <a href={`tel:${activeLead.phone}`} className="hover:text-zinc-900 transition-colors">{activeLead.phone}</a>
                </div>
              )}

              {activeLead.address && (
                <div className="flex items-start space-x-3">
                  <MapPin className="h-4 w-4 text-zinc-400 mt-0.5" />
                  <span className="leading-relaxed">{activeLead.address}</span>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <Globe className="h-4 w-4 text-zinc-400" />
                {activeLead.website ? (
                  <a 
                    href={activeLead.website.startsWith('http') ? activeLead.website : `https://${activeLead.website}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-zinc-800 hover:underline inline-flex items-center space-x-1"
                  >
                    <span>{activeLead.website}</span>
                  </a>
                ) : (
                  <span className="text-zinc-400 italic">No Website Found</span>
                )}
              </div>

              {activeLead.mapsUrl && (
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-mono text-zinc-400">Maps:</span>
                  <a 
                    href={activeLead.mapsUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-zinc-500 hover:text-zinc-900 underline text-xs"
                  >
                    View on Google Maps
                  </a>
                </div>
              )}
            </div>

            {/* Subtle Metadata Accents */}
            <div className="mt-6 pt-6 border-t border-zinc-50 flex flex-wrap gap-2">
              <span className="text-[10px] font-mono bg-[#fafaf9] text-zinc-500 px-2 py-0.5 rounded border border-zinc-100 uppercase">
                Status: {activeLead.status}
              </span>
              <span className="text-[10px] font-mono bg-[#fafaf9] text-zinc-500 px-2 py-0.5 rounded border border-zinc-100 uppercase">
                Business: {activeLead.businessStatus}
              </span>
              <span className="text-[10px] font-mono bg-[#fafaf9] text-zinc-500 px-2 py-0.5 rounded border border-zinc-100 uppercase">
                Has Website: {activeLead.hasWebsite}
              </span>
            </div>
          </div>

          {/* Card 1.5: Business Owner Contact Info */}
          <div id="business-owner-card" className="bg-white border border-zinc-100 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
            <div className="flex items-center space-x-3 mb-6">
              <div className="h-2 w-2 rounded-full bg-zinc-900" />
              <h3 className="text-lg font-display font-medium text-zinc-900 tracking-tight">Business Owner Information</h3>
            </div>
            
            <div className="flex flex-col space-y-2">
              <label htmlFor="owner-name-input" className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                <User className="h-3.5 w-3.5 text-zinc-400" />
                <span>Business Owner Name</span>
              </label>
              <input
                id="owner-name-input"
                type="text"
                className="w-full bg-[#fafaf9] border border-zinc-100 rounded-xl py-2.5 px-4 text-sm font-sans text-zinc-800 focus:outline-none focus:border-zinc-300 transition-colors placeholder-zinc-400"
                placeholder="Enter owner's name..."
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </div>
          </div>

          {/* Card 2: Pricing Configurations (Flat rate and hosting fee side-by-side) */}
          <div id="website-pricing-card" className="bg-white border border-zinc-100 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
            <div className="flex items-center space-x-3 mb-6">
              <div className="h-2 w-2 rounded-full bg-zinc-900" />
              <h3 className="text-lg font-display font-medium text-zinc-900 tracking-tight">Website Pricing Proposal</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Flat Rate Asking Field */}
              <div className="flex flex-col space-y-2">
                <label htmlFor="flat-rate-input" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Offered Flat Rate ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-mono">$</span>
                  <input
                    id="flat-rate-input"
                    type="text"
                    inputMode="numeric"
                    className="w-full bg-[#fafaf9] border border-zinc-100 rounded-xl py-2.5 pl-8 pr-4 text-sm font-mono text-zinc-800 focus:outline-none focus:border-zinc-300 transition-colors"
                    value={flatRate}
                    onChange={(e) => setFlatRate(e.target.value.replace(/[^\d]/g, ''))}
                  />
                </div>
                <span className="text-[11px] text-zinc-400 font-sans leading-normal">
                  Proposed flat-rate fee for building the custom website layout.
                </span>
              </div>

              {/* Hosting Cost Field */}
              <div className="flex flex-col space-y-2">
                <label htmlFor="hosting-rate-input" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Hosting Cost ($ / Month)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-mono">$</span>
                  <input
                    id="hosting-rate-input"
                    type="text"
                    inputMode="numeric"
                    className="w-full bg-[#fafaf9] border border-zinc-100 rounded-xl py-2.5 pl-8 pr-4 text-sm font-mono text-zinc-800 focus:outline-none focus:border-zinc-300 transition-colors"
                    value={hostingRate}
                    onChange={(e) => setHostingRate(e.target.value.replace(/[^\d]/g, ''))}
                  />
                </div>
                <span className="text-[11px] text-zinc-400 font-sans leading-normal">
                  Ongoing recurring monthly fee for reliable hosting & system support.
                </span>
              </div>
            </div>

            <label
              htmlFor="first-month-free-checkbox"
              className="mt-6 flex items-start space-x-3 cursor-pointer select-none"
            >
              <input
                id="first-month-free-checkbox"
                type="checkbox"
                checked={firstMonthFree}
                onChange={(e) => setFirstMonthFree(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400 cursor-pointer"
              />
              <span className="flex flex-col">
                <span className="text-sm font-sans text-zinc-800">First month free</span>
                <span className="text-[11px] text-zinc-400 font-sans leading-normal">
                  Waive the first month of hosting — billing starts the following month.
                </span>
              </span>
            </label>
          </div>

          {/* Card 3: Interactive Call Session Recording Widget */}
          <div id="call-recording-card" className="bg-white border border-zinc-100 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 rounded-full bg-zinc-900" />
                <h3 className="text-lg font-display font-medium text-zinc-900 tracking-tight">Active Call Recording</h3>
              </div>
              <Mic className="h-4 w-4 text-zinc-400" />
            </div>

            <p className="text-xs text-zinc-500 font-sans leading-relaxed mb-6">
              Record your sales audio session directly through your browser. Once finalized, you can save and export the high-quality call recording to your local drive for quality reviews.
            </p>

            <div className="bg-[#fafaf9] border border-zinc-100 rounded-2xl p-6 flex flex-col items-center justify-center space-y-4">
              
              {/* Recording Status & Time Counter */}
              <div className="flex items-center space-x-3">
                {isRecording ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                ) : (
                  <div className={`h-2.5 w-2.5 rounded-full ${audioUrl ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                )}
                
                <span className="text-xs font-mono font-medium text-zinc-700 tracking-wider">
                  {isRecording ? 'LIVE RECORDING ACTIVE' : audioUrl ? 'CALL SESSION CAPTURED' : 'SYSTEM READY'}
                </span>

                <span className="text-sm font-mono font-semibold text-zinc-900 pl-2 border-l border-zinc-200">
                  {formatDuration(recordingDuration)}
                </span>
              </div>

              {/* Bouncing Audio Levels Simulator (Visual feedback only while recording) */}
              {isRecording && (
                <div className="flex items-end justify-center space-x-1 h-8 px-4 w-full max-w-[200px]">
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="bg-zinc-800 w-1 rounded-full"
                      animate={{
                        height: [6, Math.floor(Math.random() * 24) + 8, 6],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.4 + i * 0.05,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 pt-2">
                {!isRecording ? (
                  <button
                    id="btn-start-recording"
                    onClick={startRecording}
                    className="inline-flex items-center space-x-2 bg-zinc-900 hover:bg-zinc-800 text-[#fafaf9] text-xs font-sans px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                  >
                    <Mic className="h-4 w-4" />
                    <span>{audioUrl ? 'Record New Session' : 'Start Session Record'}</span>
                  </button>
                ) : (
                  <button
                    id="btn-stop-recording"
                    onClick={stopRecording}
                    className="inline-flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-[#fafaf9] text-xs font-sans px-4 py-2.5 rounded-xl transition-colors cursor-pointer animate-pulse"
                  >
                    <Square className="h-4 w-4 fill-white text-white" />
                    <span>Stop Recording</span>
                  </button>
                )}

                {audioUrl && (
                  <button
                    id="btn-reset-recording"
                    onClick={resetRecording}
                    className="inline-flex items-center space-x-2 bg-white hover:bg-zinc-50 border border-zinc-100 text-zinc-600 text-xs font-sans px-3 py-2.5 rounded-xl transition-colors cursor-pointer"
                    title="Clear recording"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Audio Playback Controls and File Export */}
              {audioUrl && (
                <div className="w-full pt-4 border-t border-zinc-100/60 space-y-4">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-2">Listen & Review</span>
                    <audio id="audio-player" src={audioUrl} controls className="w-full max-w-sm h-8" />
                  </div>

                  <div className="flex justify-center">
                    <button
                      id="btn-download-recording"
                      onClick={downloadRecording}
                      className="inline-flex items-center space-x-2 bg-[#fafaf9] border border-zinc-100 hover:bg-zinc-100 text-zinc-800 text-xs font-sans px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      <Download className="h-4 w-4 text-zinc-500" />
                      <span>Download Call Recording File (.webm)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Call Notes, Calendar and Next Steps */}
          <div id="next-steps-calendar-card" className="bg-white border border-zinc-100 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
            <div className="flex items-center space-x-3 mb-6">
              <div className="h-2 w-2 rounded-full bg-zinc-900" />
              <h3 className="text-lg font-display font-medium text-zinc-900 tracking-tight">Call Outcomes & Scheduled Follow-ups</h3>
            </div>

            <div className="space-y-6">
              {/* Contact Email & Phone Stacked vertically */}
              <div className="flex flex-col space-y-4">
                <div className="flex flex-col space-y-2">
                  <label htmlFor="outcome-phone-input" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    Contact Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4 pointer-events-none" />
                    <input
                      id="outcome-phone-input"
                      type="tel"
                      className="w-full bg-[#fafaf9] border border-zinc-100 rounded-xl py-2 pl-10 pr-4 text-sm font-sans text-zinc-800 focus:outline-none focus:border-zinc-300 transition-colors placeholder-zinc-400"
                      placeholder="Phone number"
                      value={outcomePhone}
                      onChange={(e) => setOutcomePhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  <label htmlFor="outcome-email-input" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    Contact Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4 pointer-events-none" />
                    <input
                      id="outcome-email-input"
                      type="email"
                      className="w-full bg-[#fafaf9] border border-zinc-100 rounded-xl py-2 pl-10 pr-4 text-sm font-sans text-zinc-800 focus:outline-none focus:border-zinc-300 transition-colors placeholder-zinc-400"
                      placeholder="email@example.com"
                      value={outcomeEmail}
                      onChange={(e) => setOutcomeEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Call Notes */}
              <div className="flex flex-col space-y-2">
                <label htmlFor="next-steps-input" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Notes / Next Steps
                </label>
                <textarea
                  id="next-steps-input"
                  rows={3}
                  className="w-full bg-[#fafaf9] border border-zinc-100 rounded-xl p-3.5 text-sm font-sans text-zinc-700 focus:outline-none focus:border-zinc-300 transition-colors placeholder-zinc-400 resize-none"
                  placeholder="Record customer objections, custom feature requests, or followup instructions..."
                  value={nextSteps}
                  onChange={(e) => setNextSteps(e.target.value)}
                />
              </div>

              {/* Date & Time Widget */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex flex-col space-y-2">
                  <label htmlFor="followup-date-picker" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    Follow-up Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4 pointer-events-none" />
                    <input
                      id="followup-date-picker"
                      type="date"
                      className="w-full bg-[#fafaf9] border border-zinc-100 rounded-xl py-2 pl-10 pr-4 text-sm font-mono text-zinc-800 focus:outline-none focus:border-zinc-300 transition-colors"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col space-y-2">
                  <label htmlFor="followup-time-picker" className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    Time Block
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 h-4 w-4 pointer-events-none" />
                    <input
                      id="followup-time-picker"
                      type="time"
                      className="w-full bg-[#fafaf9] border border-zinc-100 rounded-xl py-2 pl-10 pr-4 text-sm font-mono text-zinc-800 focus:outline-none focus:border-zinc-300 transition-colors"
                      value={followUpTime}
                      onChange={(e) => setFollowUpTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Add to Google Calendar Trigger */}
              {followUpDate && (
                <motion.div 
                  id="calendar-button-wrapper"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-2"
                >
                  <a
                    id="btn-open-google-calendar"
                    href={getGoogleCalendarUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-2 bg-[#fafaf9] border border-zinc-100 hover:bg-zinc-100 text-zinc-800 text-xs font-sans px-4 py-2.5 rounded-xl transition-all shadow-sm"
                  >
                    <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                    <span>Schedule to Google Calendar</span>
                    <ArrowRight className="h-3 w-3 text-zinc-400" />
                  </a>
                </motion.div>
              )}
            </div>
          </div>

          {/* Save Action Bar at the Bottom */}
          <div id="save-action-bar" className="flex items-center justify-between pt-4 border-t border-zinc-100">
            <div>
              {saveSuccess && (
                <motion.span 
                  id="save-success-indicator"
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs text-zinc-500 font-sans flex items-center space-x-1.5"
                >
                  <Check className="h-4 w-4 text-zinc-900" />
                  <span>Lead saved to contact book</span>
                </motion.span>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                id="btn-save-lead"
                onClick={handleSave}
                className="inline-flex items-center space-x-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-sans px-5 py-3 rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Save Lead Record</span>
              </button>
            </div>
          </div>

          {/* Client follow-up message — copy & paste ready */}
          <div id="client-summary-card" className="bg-white border border-zinc-100 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 rounded-full bg-zinc-900" />
                <h3 className="text-lg font-display font-medium text-zinc-900 tracking-tight">Client Follow-Up Message</h3>
              </div>
              <button
                id="btn-copy-client-summary"
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center space-x-2 bg-[#fafaf9] border border-zinc-100 hover:bg-zinc-100 text-zinc-800 text-xs font-sans px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer shrink-0"
              >
                {summaryCopied ? (
                  <>
                    <ClipboardCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-zinc-500" />
                    <span>Copy message</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-zinc-500 font-sans leading-relaxed mb-4">
              Auto-generated from the fields above. Copy and paste into a text or email.
            </p>

            <pre
              id="client-summary-preview"
              className="w-full whitespace-pre-wrap bg-[#fafaf9] border border-zinc-100 rounded-xl p-4 text-sm font-sans text-zinc-700 leading-relaxed"
            >
              {buildClientSummary()}
            </pre>
          </div>
        </motion.div>
      )}
    </div>
  );
}
