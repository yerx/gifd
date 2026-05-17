'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  domains as domainsApi,
  seasonalConfig as seasonalApi,
  dailyPlans,
  weeklyThemeTemplates,
} from '@/lib/api';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const ICON_OPTIONS = ['💼', '🏠', '💻', '🎨', '📚', '🏋️', '🌱', '🎵', '✈️', '🔧', '📊', '🎯'];

const DEFAULT_SUGGESTIONS = [
  { name: 'W-2 Job', color: '#3B82F6', icon: '💼' },
  { name: 'Freelance', color: '#10B981', icon: '💻' },
  { name: 'Apps', color: '#8B5CF6', icon: '📊' },
  { name: 'Homestead', color: '#F59E0B', icon: '🏠' },
  { name: 'Personal', color: '#EC4899', icon: '🎯' },
];

interface WizardDomain {
  id: string; // local unique id for dnd-kit
  name: string;
  color: string;
  icon: string | null;
}

interface WorkDay {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
}

const DEFAULT_WORK_HOURS: WorkDay[] = [
  { day: 'Monday', enabled: true, start: '08:00', end: '18:00' },
  { day: 'Tuesday', enabled: true, start: '08:00', end: '18:00' },
  { day: 'Wednesday', enabled: true, start: '08:00', end: '18:00' },
  { day: 'Thursday', enabled: true, start: '08:00', end: '18:00' },
  { day: 'Friday', enabled: true, start: '08:00', end: '18:00' },
  { day: 'Saturday', enabled: true, start: '08:00', end: '13:00' },
  { day: 'Sunday', enabled: false, start: '08:00', end: '12:00' },
];

let nextLocalId = 1;
function makeLocalId(): string {
  return `local-${nextLocalId++}`;
}

/* ─── Sortable Domain Item for Setup Wizard ─── */

function SortableWizardDomain({
  domain,
  index,
  onUpdate,
  onRemove,
}: {
  domain: WizardDomain;
  index: number;
  onUpdate: (index: number, field: keyof WizardDomain, value: string | null) => void;
  onRemove: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: domain.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gw-stone-200"
    >
      {/* Drag handle */}
      <button
        className="cursor-grab active:cursor-grabbing text-gw-stone-400 hover:text-gw-stone-600 flex-shrink-0"
        {...attributes}
        {...listeners}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>
      <input
        type="color"
        value={domain.color}
        onChange={(e) => onUpdate(index, 'color', e.target.value)}
        className="w-8 h-8 rounded border border-gw-stone-200 cursor-pointer flex-shrink-0"
      />
      <input
        type="text"
        value={domain.name}
        onChange={(e) => onUpdate(index, 'name', e.target.value)}
        placeholder="Domain name..."
        className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500"
      />
      <div className="flex gap-0.5">
        {ICON_OPTIONS.slice(0, 6).map((icon) => (
          <button
            key={icon}
            type="button"
            onClick={() => onUpdate(index, 'icon', domain.icon === icon ? null : icon)}
            className={`w-7 h-7 rounded text-sm ${
              domain.icon === icon
                ? 'bg-gw-green-100 border border-gw-green-400'
                : 'hover:bg-gw-stone-100'
            }`}
          >
            {icon}
          </button>
        ))}
      </div>
      <button
        onClick={() => onRemove(index)}
        className="text-gw-stone-400 hover:text-red-500 p-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0=welcome, 1=domains, 2=hours, 3=seasonal, 4=summary
  const [showPairing, setShowPairing] = useState(false);
  const [pairingStep, setPairingStep] = useState(0);
  const [domains, setDomains] = useState<WizardDomain[]>(
    DEFAULT_SUGGESTIONS.map((s) => ({ ...s, id: makeLocalId() }))
  );
  const [workHours, setWorkHours] = useState<WorkDay[]>(DEFAULT_WORK_HOURS);
  const [bufferPercent, setBufferPercent] = useState(20);
  const [seasonalEnabled, setSeasonalEnabled] = useState(false);
  const [usdaZone, setUsdaZone] = useState('');
  const [lastFrost, setLastFrost] = useState('');
  const [firstFrost, setFirstFrost] = useState('');
  const [saving, setSaving] = useState(false);

  // dnd-kit sensors for domain reorder
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Check if setup already done
  useEffect(() => {
    async function check() {
      try {
        const data = await domainsApi.list();
        if ((data as unknown[]).length > 0) {
          router.replace('/cockpit');
        }
      } catch {
        // API not running
      }
    }
    check();
  }, [router]);

  function addDomain() {
    setDomains((prev) => [
      ...prev,
      { id: makeLocalId(), name: '', color: '#6B7280', icon: null },
    ]);
  }

  function removeDomain(index: number) {
    setDomains((prev) => prev.filter((_, i) => i !== index));
  }

  function updateDomain(index: number, field: keyof WizardDomain, value: string | null) {
    setDomains((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value as string };
      return updated;
    });
  }

  // Index 48: drag-to-reorder domains in step 1 (local state only)
  function handleDomainDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = domains.findIndex((d) => d.id === active.id);
    const newIndex = domains.findIndex((d) => d.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    setDomains(arrayMove(domains, oldIndex, newIndex));
  }

  function updateWorkDay(index: number, field: keyof WorkDay, value: string | boolean) {
    setWorkHours((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function getTotalWeeklyMinutes() {
    return workHours.reduce((total, day) => {
      if (!day.enabled) return total;
      const [sh, sm] = day.start.split(':').map(Number);
      const [eh, em] = day.end.split(':').map(Number);
      return total + (eh * 60 + em) - (sh * 60 + sm);
    }, 0);
  }

  // Index 49: compute effective capacity
  const totalMinutes = getTotalWeeklyMinutes();
  const effectiveMinutes = Math.round(totalMinutes * (1 - bufferPercent / 100));

  // Compute today's available minutes from work hours
  function getTodayAvailableMinutes(): number {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayDayName = dayNames[new Date().getDay()];
    const todayConfig = workHours.find((d) => d.day === todayDayName);
    if (!todayConfig || !todayConfig.enabled) return 0;
    const [sh, sm] = todayConfig.start.split(':').map(Number);
    const [eh, em] = todayConfig.end.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  }

  async function completeSetup() {
    setSaving(true);
    try {
      // Create domains
      const validDomains = domains.filter((d) => d.name.trim());
      for (let i = 0; i < validDomains.length; i++) {
        await domainsApi.create({
          name: validDomains[i].name.trim(),
          color: validDomains[i].color,
          icon: validDomains[i].icon,
          sort_order: i + 1,
        });
      }

      // Index 52: Only save work_hours to seasonal_config when seasonal is ON.
      // When seasonal is OFF, store derived values directly in the daily plan instead.
      if (seasonalEnabled) {
        // Save work hours config to seasonal_config
        await seasonalApi.create({
          key: 'work_hours',
          value: JSON.stringify({ days: workHours, buffer_percent: bufferPercent }),
        });

        // Save seasonal config
        if (usdaZone) {
          await seasonalApi.create({ key: 'usda_zone', value: usdaZone });
        }
        if (lastFrost) {
          await seasonalApi.create({ key: 'last_frost_date', value: lastFrost });
        }
        if (firstFrost) {
          await seasonalApi.create({ key: 'first_frost_date', value: firstFrost });
        }
      }

      // Index 51: Create daily plan for today with derived capacity values
      const availableMinutes = getTodayAvailableMinutes();
      await dailyPlans.create({
        date: todayStr(),
        available_minutes: availableMinutes,
        buffer_percent: bufferPercent,
      });

      // Index 51: Create default weekly theme template
      await weeklyThemeTemplates.create({
        name: 'Default',
        is_active: 1,
      });

      router.replace('/cockpit');
    } catch (err) {
      console.error('Setup error:', err);
      setSaving(false);
    }
  }

  // Welcome screen
  if (step === 0) {
    // Feature 146: Device pairing flow
    if (showPairing) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gw-stone-50 -ml-60">
          <div className="max-w-md w-full">
            {pairingStep === 0 && (
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gw-green-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gw-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gw-stone-900 mb-2">Pair with another device</h2>
                <p className="text-gw-stone-500 mb-8">
                  Sync your GroundWork data from an existing device on your local network.
                </p>
                <div className="space-y-3 text-left p-4 rounded-lg bg-white border border-gw-stone-200 mb-6">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gw-green-100 text-gw-green-700 text-xs font-bold flex items-center justify-center mt-0.5">1</span>
                    <p className="text-sm text-gw-stone-600">Open GroundWork on your existing device and go to <span className="font-medium">Settings &gt; Sync &amp; Devices</span></p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gw-green-100 text-gw-green-700 text-xs font-bold flex items-center justify-center mt-0.5">2</span>
                    <p className="text-sm text-gw-stone-600">Make sure both devices are connected to the <span className="font-medium">same local network</span></p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gw-green-100 text-gw-green-700 text-xs font-bold flex items-center justify-center mt-0.5">3</span>
                    <p className="text-sm text-gw-stone-600">This device will appear as a peer and data will sync automatically</p>
                  </div>
                </div>
                <button
                  onClick={() => setPairingStep(1)}
                  className="btn-primary text-sm px-6 py-2.5 w-full mb-3"
                >
                  Start scanning for devices
                </button>
                <button
                  onClick={() => setShowPairing(false)}
                  className="text-sm text-gw-stone-500 hover:text-gw-stone-700"
                >
                  Back to setup options
                </button>
              </div>
            )}

            {pairingStep === 1 && (
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gw-stone-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gw-stone-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M21.015 4.356v4.992" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gw-stone-900 mb-2">Scanning for devices...</h2>
                <p className="text-gw-stone-500 mb-6">
                  Looking for GroundWork instances on your local network.
                </p>
                <div className="p-4 rounded-lg bg-white border border-dashed border-gw-stone-200 mb-6">
                  <div className="flex items-center justify-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gw-stone-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-gw-stone-400" />
                    </span>
                    <span className="text-sm text-gw-stone-400 italic">No devices found yet</span>
                  </div>
                </div>
                <p className="text-xs text-gw-stone-400 mb-6">
                  Peer-to-peer sync is not yet available. You can set up a fresh system now and sync later when this feature is released.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowPairing(false); setPairingStep(0); }}
                    className="btn-secondary text-sm flex-1"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => { setShowPairing(false); setPairingStep(0); setStep(1); }}
                    className="btn-primary text-sm flex-1"
                  >
                    Start fresh setup instead
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gw-stone-50 -ml-60">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold text-gw-stone-900 mb-2">GROUNDWORK</h1>
          <p className="text-gw-stone-500 mb-8">
            Your local-first personal operating system for getting things done.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setStep(1)}
              className="btn-primary text-lg px-8 py-3 w-full"
            >
              Let&apos;s set up your system
            </button>
            <button
              onClick={() => setShowPairing(true)}
              className="btn-secondary text-sm px-8 py-2.5 w-full flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
              I have another device
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step indicator
  const stepLabels = ['Domains', 'Work Hours', 'Seasonal', 'Summary'];
  const currentStepIndex = step - 1;

  return (
    <div className="min-h-screen bg-gw-stone-50 -ml-60">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i < currentStepIndex
                    ? 'bg-gw-green-500 text-white'
                    : i === currentStepIndex
                    ? 'bg-gw-green-600 text-white ring-4 ring-gw-green-100'
                    : 'bg-gw-stone-200 text-gw-stone-500'
                }`}
              >
                {i < currentStepIndex ? '\u2713' : i + 1}
              </div>
              <span
                className={`text-xs font-medium ${
                  i === currentStepIndex ? 'text-gw-green-700' : 'text-gw-stone-400'
                }`}
              >
                {label}
              </span>
              {i < stepLabels.length - 1 && (
                <div
                  className={`w-8 h-0.5 ${
                    i < currentStepIndex ? 'bg-gw-green-400' : 'bg-gw-stone-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Domains (Index 48: with drag-and-drop) */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-gw-stone-900 mb-2">Set up your domains</h2>
            <p className="text-gw-stone-500 mb-6">
              Domains are the major areas of your life. We&apos;ve suggested some — edit, remove, or add your own. Drag to reorder.
            </p>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDomainDragEnd}>
              <SortableContext items={domains.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3 mb-4">
                  {domains.map((domain, i) => (
                    <SortableWizardDomain
                      key={domain.id}
                      domain={domain}
                      index={i}
                      onUpdate={updateDomain}
                      onRemove={removeDomain}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <button
              onClick={addDomain}
              className="text-sm text-gw-green-600 hover:text-gw-green-700 font-medium mb-8"
            >
              + Add another domain
            </button>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={domains.filter((d) => d.name.trim()).length === 0}
                className="btn-primary disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Work Hours (Index 49: capacity summary) */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-gw-stone-900 mb-2">Configure your work hours</h2>
            <p className="text-gw-stone-500 mb-6">
              Set your available hours for each day. Toggle OFF days you don&apos;t work.
            </p>

            <div className="space-y-2 mb-6">
              {workHours.map((day, i) => (
                <div key={day.day} className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gw-stone-200">
                  <div className="w-24 text-sm font-medium text-gw-stone-700">{day.day}</div>
                  <div
                    className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors ${
                      day.enabled ? 'bg-gw-green-500' : 'bg-gw-stone-300'
                    }`}
                    onClick={() => updateWorkDay(i, 'enabled', !day.enabled)}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        day.enabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                  {day.enabled ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        value={day.start}
                        onChange={(e) => updateWorkDay(i, 'start', e.target.value)}
                        className="px-2 py-1 text-sm rounded border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500"
                      />
                      <span className="text-xs text-gw-stone-400">to</span>
                      <input
                        type="time"
                        value={day.end}
                        onChange={(e) => updateWorkDay(i, 'end', e.target.value)}
                        className="px-2 py-1 text-sm rounded border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-gw-stone-400 italic">OFF</span>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 rounded-lg bg-white border border-gw-stone-200 mb-4">
              <label className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gw-stone-600">Buffer percentage</span>
                <span className="text-sm font-bold text-gw-stone-800">{bufferPercent}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={50}
                value={bufferPercent}
                onChange={(e) => setBufferPercent(Number(e.target.value))}
                className="w-full accent-gw-green-600"
              />
              <p className="text-xs text-gw-stone-400 mt-1">
                Reserve {bufferPercent}% of your day for unexpected tasks and breaks.
              </p>
            </div>

            {/* Index 49: Weekly total and effective capacity summary */}
            <div className="p-4 rounded-lg bg-gw-green-50 border border-gw-green-200 mb-8">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gw-stone-700">Weekly total:</span>
                <span className="text-sm font-bold text-gw-stone-800">
                  {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gw-stone-700">Effective capacity:</span>
                <span className="text-sm font-bold text-gw-green-700">
                  {Math.floor(effectiveMinutes / 60)}h {effectiveMinutes % 60}m
                  <span className="text-gw-stone-400 font-normal ml-1">(after {bufferPercent}% buffer)</span>
                </span>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
              <button onClick={() => setStep(3)} className="btn-primary">Continue</button>
            </div>
          </div>
        )}

        {/* Step 3: Seasonal Config */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-gw-stone-900 mb-2">Seasonal configuration</h2>
            <p className="text-gw-stone-500 mb-6">
              Do you manage seasonal or outdoor projects? This is optional.
            </p>

            <div className="p-4 rounded-lg bg-white border border-gw-stone-200 mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    seasonalEnabled ? 'bg-gw-green-500' : 'bg-gw-stone-300'
                  }`}
                  onClick={() => setSeasonalEnabled(!seasonalEnabled)}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      seasonalEnabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </div>
                <span className="text-sm font-medium text-gw-stone-700">
                  I manage seasonal or outdoor projects
                </span>
              </label>
            </div>

            {seasonalEnabled && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gw-stone-600 mb-1">
                    USDA Planting Zone
                  </label>
                  <input
                    type="text"
                    value={usdaZone}
                    onChange={(e) => setUsdaZone(e.target.value)}
                    placeholder="e.g., 7b"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gw-stone-600 mb-1">
                    Last Frost Date
                  </label>
                  <input
                    type="text"
                    value={lastFrost}
                    onChange={(e) => setLastFrost(e.target.value)}
                    placeholder="e.g., April 15"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gw-stone-600 mb-1">
                    First Frost Date
                  </label>
                  <input
                    type="text"
                    value={firstFrost}
                    onChange={(e) => setFirstFrost(e.target.value)}
                    placeholder="e.g., October 15"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gw-stone-200 focus:outline-none focus:ring-2 focus:ring-gw-green-500"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="btn-secondary">Back</button>
              <button onClick={() => setStep(4)} className="btn-primary">Continue</button>
            </div>
          </div>
        )}

        {/* Step 4: Summary */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold text-gw-stone-900 mb-2">Confirm your setup</h2>
            <p className="text-gw-stone-500 mb-6">Review your configuration before getting started.</p>

            {/* Domains summary */}
            <div className="p-4 rounded-lg bg-white border border-gw-stone-200 mb-4">
              <h3 className="text-sm font-semibold text-gw-stone-700 mb-2">
                Domains ({domains.filter((d) => d.name.trim()).length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {domains.filter((d) => d.name.trim()).map((d) => (
                  <span
                    key={d.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm text-white font-medium"
                    style={{ backgroundColor: d.color }}
                  >
                    {d.icon && <span>{d.icon}</span>}
                    {d.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Work hours summary */}
            <div className="p-4 rounded-lg bg-white border border-gw-stone-200 mb-4">
              <h3 className="text-sm font-semibold text-gw-stone-700 mb-2">Work Hours</h3>
              <div className="text-sm text-gw-stone-600 space-y-1">
                {workHours.map((day) => (
                  <div key={day.day} className="flex justify-between">
                    <span>{day.day}</span>
                    <span className={day.enabled ? '' : 'text-gw-stone-400 italic'}>
                      {day.enabled ? `${day.start} - ${day.end}` : 'OFF'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-gw-stone-100 text-sm text-gw-stone-500">
                Buffer: {bufferPercent}% | Weekly total: {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
              </div>
              <div className="text-sm text-gw-green-600 font-medium">
                Effective capacity: {Math.floor(effectiveMinutes / 60)}h {effectiveMinutes % 60}m (after {bufferPercent}% buffer)
              </div>
            </div>

            {/* Seasonal summary */}
            <div className="p-4 rounded-lg bg-white border border-gw-stone-200 mb-8">
              <h3 className="text-sm font-semibold text-gw-stone-700 mb-2">Seasonal</h3>
              {seasonalEnabled ? (
                <div className="text-sm text-gw-stone-600 space-y-1">
                  {usdaZone && <div>USDA Zone: {usdaZone}</div>}
                  {lastFrost && <div>Last Frost: {lastFrost}</div>}
                  {firstFrost && <div>First Frost: {firstFrost}</div>}
                </div>
              ) : (
                <p className="text-sm text-gw-stone-400 italic">Not configured</p>
              )}
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(3)} className="btn-secondary">Back</button>
              <button
                onClick={completeSetup}
                disabled={saving}
                className="btn-primary disabled:opacity-50"
              >
                {saving ? 'Setting up...' : 'Complete Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
