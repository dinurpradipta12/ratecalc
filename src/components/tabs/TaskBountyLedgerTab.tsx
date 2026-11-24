import React, { useState } from 'react';
import { Personnel, TaskItem, TaskStatus, TierConfig, BudgetTelemetry } from '../../types';
import { INITIAL_TIERS } from '../../data/initialData';
import { formatIDR } from '../../utils/formatters';
import { PdfPreviewModal, PdfPreviewTarget } from '../PdfPreviewModal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Search,
  Download
} from 'lucide-react';

interface TaskBountyLedgerTabProps {
  personnel: Personnel[];
  tiers?: TierConfig[];
  telemetry?: BudgetTelemetry;
  activePersonId: string;
  onSelectPerson: (personId: string) => void;
  onUpdatePerson: (updatedPerson: Personnel) => void;
}

export const TaskBountyLedgerTab: React.FC<TaskBountyLedgerTabProps> = ({
  personnel,
  tiers = INITIAL_TIERS,
  telemetry,
  activePersonId,
  onSelectPerson,
  onUpdatePerson,
}) => {
  const [personSearch, setPersonSearch] = useState('');
  const [pdfPreviewTarget, setPdfPreviewTarget] = useState<PdfPreviewTarget | null>(null);

  // Custom task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState<TaskItem['category']>('MARKETING');
  const [taskPrice, setTaskPrice] = useState('850000');
  const [taskQty, setTaskQty] = useState(1);
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('SELESAI');

  const activePerson = personnel.find((p) => p.id === activePersonId) || personnel[0];

  const filteredPersonnel = personnel.filter((p) => {
    const q = personSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.roleTitle.toLowerCase().includes(q);
  });

  // Calculate active person metrics
  const completedTasks = activePerson ? activePerson.tasks.filter((t) => t.status === 'SELESAI') : [];
  const pendingTasks = activePerson ? activePerson.tasks.filter((t) => t.status === 'PROSES') : [];
  const completedBountyTotal = completedTasks.reduce((sum, t) => sum + t.unitPrice * t.quantity, 0);
  const pendingBountyTotal = pendingTasks.reduce((sum, t) => sum + t.unitPrice * t.quantity, 0);

  // Add Custom Task
  const handleAddCustomTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePerson || !taskTitle.trim()) return;

    const priceNum = parseInt(taskPrice.replace(/[^0-9]/g, ''), 10) || 500000;
    const newTask: TaskItem = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: taskTitle.trim(),
      category: taskCategory,
      unitPrice: priceNum,
      quantity: Math.max(1, taskQty),
      status: taskStatus,
      createdAt: new Date().toISOString().split('T')[0],
    };

    onUpdatePerson({
      ...activePerson,
      tasks: [newTask, ...activePerson.tasks],
    });

    setTaskTitle('');
    setTaskQty(1);
  };

  // Toggle Task Status between SELESAI and PROSES
  const handleToggleTaskStatus = (taskId: string) => {
    if (!activePerson) return;
    const updatedTasks = activePerson.tasks.map((task) => {
      if (task.id === taskId) {
        const nextStatus: TaskStatus = task.status === 'SELESAI' ? 'PROSES' : 'SELESAI';
        return { ...task, status: nextStatus };
      }
      return task;
    });

    onUpdatePerson({
      ...activePerson,
      tasks: updatedTasks,
    });
  };

  // Adjust Task Price
  const handleTaskPriceDelta = (taskId: string, delta: number) => {
    if (!activePerson) return;
    const updatedTasks = activePerson.tasks.map((task) => {
      if (task.id === taskId) {
        return { ...task, unitPrice: Math.max(50_000, task.unitPrice + delta) };
      }
      return task;
    });

    onUpdatePerson({
      ...activePerson,
      tasks: updatedTasks,
    });
  };

  // Adjust Task Qty
  const handleTaskQtyDelta = (taskId: string, delta: number) => {
    if (!activePerson) return;
    const updatedTasks = activePerson.tasks.map((task) => {
      if (task.id === taskId) {
        return { ...task, quantity: Math.max(1, task.quantity + delta) };
      }
      return task;
    });

    onUpdatePerson({
      ...activePerson,
      tasks: updatedTasks,
    });
  };

  // Delete Task
  const handleDeleteTask = (taskId: string) => {
    if (!activePerson) return;
    const updatedTasks = activePerson.tasks.filter((t) => t.id !== taskId);
    onUpdatePerson({
      ...activePerson,
      tasks: updatedTasks,
    });
  };

  return (
    <div className="space-y-6">
      {telemetry && (
        <PdfPreviewModal
          previewTarget={pdfPreviewTarget}
          onClose={() => setPdfPreviewTarget(null)}
          personnel={personnel}
          tiers={tiers}
          telemetry={telemetry}
        />
      )}

      {/* SECTION TOP HEADER */}
      <div className="bg-white border border-carbon p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-brutalist">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-accent">LEDGER // 03</span>
            <h2 className="font-display font-extrabold text-lg uppercase tracking-tighter">
              Split Workspace: Task & Bounty Ledger
            </h2>
          </div>
          <p className="text-xs text-mutedText font-ui mt-0.5">
            Audit itemized bounty komisi per person. Tambahkan dan kelola rincian tugas untuk setiap personel.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="neutral" size="sm">
            TOTAL TIM: {personnel.reduce((s, p) => s + p.tasks.filter(t => t.status === 'SELESAI').length, 0)} COMPLETED
          </Badge>
          <Badge variant="emerald" size="sm">
            {formatIDR(personnel.reduce((s, p) => s + p.tasks.filter(t => t.status === 'SELESAI').reduce((acc, t) => acc + (t.unitPrice * t.quantity), 0), 0))}
          </Badge>
        </div>
      </div>

      {/* SPLIT MASTER-DETAIL WORKSPACE (4 Cols Left, 8 Cols Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: 4 COLS - SELECTABLE PERSONNEL LIST */}
        <div className="lg:col-span-4 bg-white border border-carbon shadow-brutalist flex flex-col">
          {/* Header of list */}
          <div className="p-3 bg-subtle border-b border-carbon">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold uppercase text-carbon">
                DAFTAR ANGGOTA TIM
              </span>
              <span className="text-[10px] font-mono text-mutedText">
                {filteredPersonnel.length} PERSONEL
              </span>
            </div>
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-mutedText" />
              <input
                type="text"
                placeholder="Cari nama atau role..."
                value={personSearch}
                onChange={(e) => setPersonSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-carbon font-ui focus:outline-none"
              />
            </div>
          </div>

          {/* Personnel items */}
          <div className="divide-y divide-carbon max-h-[640px] overflow-y-auto">
            {filteredPersonnel.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-mutedText">
                {personnel.length === 0 ? 'Belum ada personel terdaftar.' : 'Tidak ditemukan personel.'}
              </div>
            ) : (
              filteredPersonnel.map((person) => {
              const isSelected = activePerson && activePerson.id === person.id;
              const completedCount = person.tasks.filter((t) => t.status === 'SELESAI').length;
              const completedSum = person.tasks
                .filter((t) => t.status === 'SELESAI')
                .reduce((s, t) => s + t.unitPrice * t.quantity, 0);

              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => onSelectPerson(person.id)}
                  className={`w-full min-h-[58px] p-3 text-left transition-all flex items-center justify-between cursor-pointer select-none relative ${
                    isSelected
                      ? 'bg-carbon text-white'
                      : 'bg-white hover:bg-subtle text-carbon'
                  }`}
                >
                  {/* Left accent border */}
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
                  )}

                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-ui font-bold text-xs sm:text-sm truncate">
                        {person.name}
                      </span>
                      <span className={`text-[9px] font-mono px-1 border ${
                        isSelected ? 'border-white text-white' : 'border-carbon text-mutedText'
                      }`}>
                        {person.tierId.replace('TIER_', 'T')}
                      </span>
                    </div>
                    <p className={`text-[11px] font-ui truncate mt-0.5 ${
                      isSelected ? 'text-gray-300' : 'text-mutedText'
                    }`}>
                      {person.roleTitle}
                    </p>
                  </div>

                  {/* Bounty Subtotal pill */}
                  <div className="text-right shrink-0">
                    <div className={`text-xs font-mono font-bold tabular-numbers ${
                      isSelected ? 'text-emerald-300' : 'text-semantic-emerald'
                    }`}>
                      {formatIDR(completedSum)}
                    </div>
                    <div className={`text-[10px] font-mono ${
                      isSelected ? 'text-gray-300' : 'text-mutedText'
                    }`}>
                      {completedCount} task selesai
                    </div>
                  </div>
                </button>
              );
            }))}
          </div>
        </div>

        {/* RIGHT COLUMN: 8 COLS - ACTIVE PERSON TASK LEDGER */}
        {activePerson ? (
          <div className="lg:col-span-8 space-y-6">
            {/* ACTIVE PERSON HERO TELEMETRY CARD */}
            <div className="bg-white border border-carbon p-4 shadow-brutalist">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-carbon">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-accent inline-block border border-carbon" />
                    <h3 className="font-display font-extrabold text-base uppercase tracking-tight">
                      Ledger Task: {activePerson.name}
                    </h3>
                  </div>
                  <p className="text-xs text-mutedText font-ui mt-0.5">
                    {activePerson.roleTitle} • <strong className="text-carbon">{activePerson.tierId}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="bg-emerald-50 border border-semantic-emerald px-3 py-1 text-right">
                    <span className="block text-[10px] font-mono text-mutedText uppercase">Bounty Selesai:</span>
                    <span className="font-mono font-extrabold text-sm text-semantic-emerald tabular-numbers">
                      {formatIDR(completedBountyTotal)}
                    </span>
                  </div>
                  <div className="bg-subtle border border-carbon px-3 py-1 text-right">
                    <span className="block text-[10px] font-mono text-mutedText uppercase">Gaji Pokok:</span>
                    <span className="font-mono font-extrabold text-sm text-carbon tabular-numbers">
                      {formatIDR(activePerson.baseSalary)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setPdfPreviewTarget({
                        mode: 'person',
                        personId: activePerson.id,
                      })
                    }
                    className="min-h-[44px] px-3 py-1.5 bg-carbon hover:bg-accent text-white font-mono font-bold text-xs border border-carbon inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    title={`Preview & Download PDF Slip Gaji & Tugas untuk ${activePerson.name}`}
                  >
                    <Download className="w-3.5 h-3.5 text-white" />
                    Slip PDF
                  </button>
                </div>
              </div>

              {/* SECTION: CUSTOM ADD TASK FORM */}
              <form onSubmit={handleAddCustomTask} className="mt-4 p-3 bg-subtle border border-carbon">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono font-bold uppercase text-carbon flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5 text-accent" />
                    Tambah Task Baru
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-mono text-mutedText uppercase cursor-pointer">
                      Status Awal:
                    </label>
                    <button
                      type="button"
                      onClick={() => setTaskStatus(taskStatus === 'SELESAI' ? 'PROSES' : 'SELESAI')}
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 border border-carbon cursor-pointer ${
                        taskStatus === 'SELESAI'
                          ? 'bg-emerald-100 text-semantic-emerald border-semantic-emerald'
                          : 'bg-amber-100 text-semantic-amber border-semantic-amber'
                      }`}
                    >
                      [{taskStatus}]
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  {/* Title */}
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      required
                      placeholder="Judul task / deliverables..."
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-carbon font-ui focus:outline-none"
                    />
                  </div>

                  {/* Category */}
                  <div className="sm:col-span-2">
                    <select
                      value={taskCategory}
                      onChange={(e) => setTaskCategory(e.target.value as TaskItem['category'])}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-carbon font-mono font-bold focus:outline-none"
                    >
                      <option value="MARKETING">MARKETING</option>
                      <option value="DESIGN">DESIGN</option>
                      <option value="DEVELOPMENT">DEV</option>
                      <option value="CONTENT">CONTENT</option>
                      <option value="OPERATIONS">OPS</option>
                    </select>
                  </div>

                  {/* Price */}
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Harga Satuan (IDR)"
                      value={new Intl.NumberFormat('id-ID').format(parseInt(taskPrice || '0', 10))}
                      onChange={(e) => setTaskPrice(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-carbon font-mono font-bold tabular-numbers focus:outline-none"
                    />
                  </div>

                  {/* Qty & Add Button */}
                  <div className="sm:col-span-2 flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={taskQty}
                      onChange={(e) => setTaskQty(parseInt(e.target.value, 10) || 1)}
                      className="w-12 px-1.5 py-1.5 text-xs bg-white border border-carbon font-mono font-bold text-center tabular-numbers focus:outline-none"
                      title="Jumlah / Qty"
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="flex-1 min-h-[34px] px-2 text-xs font-mono"
                    >
                      + Add
                    </Button>
                  </div>
                </div>
              </form>
            </div>

            {/* TASK TABLE (ITEMIZED LIST) */}
            <div className="bg-white border border-carbon shadow-brutalist overflow-hidden">
              <div
                tabIndex={0}
                role="region"
                aria-labelledby="tasks-table-caption"
                className="table-wrapper overflow-x-auto max-w-full"
              >
                <table className="w-full border-collapse text-left">
                  <caption id="tasks-table-caption" className="sr-only">
                    Daftar rincian task bounty untuk {activePerson.name}
                  </caption>
                  <thead className="bg-subtle border-b border-carbon sticky top-0 z-10">
                    <tr className="divide-x divide-carbon">
                      <th scope="col" className="px-3 py-2.5 text-[11px] font-mono font-bold uppercase text-carbon w-28 text-center">
                        STATUS
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-[11px] font-mono font-bold uppercase text-carbon">
                        Deskripsi Task & Kategori
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-[11px] font-mono font-bold uppercase text-carbon w-48 text-right">
                        Harga Satuan (IDR)
                      </th>
                      <th scope="col" className="px-2 py-2.5 text-[11px] font-mono font-bold uppercase text-carbon w-24 text-center">
                        QTY
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-[11px] font-mono font-bold uppercase text-carbon w-36 text-right">
                        Total Baris
                      </th>
                      <th scope="col" className="px-2 py-2.5 text-[11px] font-mono font-bold uppercase text-carbon w-12 text-center">
                        DEL
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-carbon">
                    {activePerson.tasks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-mutedText font-mono text-xs">
                          Belum ada task yang ditambahkan untuk {activePerson.name}. Gunakan formulir di atas untuk menambahkan task baru.
                        </td>
                      </tr>
                    ) : (
                      activePerson.tasks.map((task) => {
                        const isDone = task.status === 'SELESAI';
                        const lineTotal = task.unitPrice * task.quantity;

                        return (
                          <tr
                            key={task.id}
                            className={`divide-x divide-carbon transition-colors ${
                              isDone ? 'hover:bg-subtle/30' : 'bg-amber-50/40 hover:bg-amber-50/70'
                            }`}
                          >
                            {/* 1. Status Toggle Button (min 44x44px target) */}
                            <td className="p-1 text-center align-middle">
                              <button
                                type="button"
                                onClick={() => handleToggleTaskStatus(task.id)}
                                className={`w-full min-h-[44px] px-2 py-1 text-[11px] font-mono font-bold border border-carbon transition-all cursor-pointer select-none flex items-center justify-center gap-1 ${
                                  isDone
                                    ? 'bg-emerald-100 text-semantic-emerald border-semantic-emerald hover:bg-emerald-200'
                                    : 'bg-amber-100 text-semantic-amber border-semantic-amber hover:bg-amber-200'
                                }`}
                                title="Klik untuk mengubah status antara SELESAI dan PROSES"
                              >
                                {isDone ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    SELESAI
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3.5 h-3.5" />
                                    PROSES
                                  </>
                                )}
                              </button>
                            </td>

                            {/* 2. Task Title & Category */}
                            <td className="px-4 py-2.5 align-middle">
                              <div className="font-ui font-medium text-xs sm:text-sm text-carbon leading-snug">
                                {task.title}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 bg-subtle border border-carbon text-carbon uppercase">
                                  {task.category}
                                </span>
                                <span className="text-[10px] font-mono text-mutedText">
                                  {task.createdAt}
                                </span>
                              </div>
                            </td>

                            {/* 3. Inline Editable IDR Price with -/+ steppers */}
                            <td className="px-3 py-2.5 align-middle text-right">
                              <div className="font-mono font-bold text-xs sm:text-sm text-carbon tabular-numbers">
                                {formatIDR(task.unitPrice)}
                              </div>
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <button
                                  type="button"
                                  onClick={() => handleTaskPriceDelta(task.id, -50_000)}
                                  className="min-h-[32px] px-1.5 py-0.5 text-[10px] font-mono font-bold border border-carbon bg-subtle hover:bg-white text-carbon active:bg-gray-200 cursor-pointer"
                                  title="Kurang 50rb"
                                >
                                  -50k
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTaskPriceDelta(task.id, 50_000)}
                                  className="min-h-[32px] px-1.5 py-0.5 text-[10px] font-mono font-bold border border-carbon bg-subtle hover:bg-white text-carbon active:bg-gray-200 cursor-pointer"
                                  title="Tambah 50rb"
                                >
                                  +50k
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTaskPriceDelta(task.id, 250_000)}
                                  className="min-h-[32px] px-1.5 py-0.5 text-[10px] font-mono font-bold border border-carbon bg-subtle hover:bg-white text-carbon active:bg-gray-200 cursor-pointer"
                                  title="Tambah 250rb"
                                >
                                  +250k
                                </button>
                              </div>
                            </td>

                            {/* 4. Quantity Multiplier */}
                            <td className="px-2 py-2.5 align-middle text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleTaskQtyDelta(task.id, -1)}
                                  disabled={task.quantity <= 1}
                                  className="w-7 h-7 text-xs font-mono font-bold border border-carbon bg-subtle hover:bg-white disabled:opacity-30 cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="w-6 font-mono font-bold text-xs text-carbon tabular-numbers text-center">
                                  {task.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleTaskQtyDelta(task.id, 1)}
                                  className="w-7 h-7 text-xs font-mono font-bold border border-carbon bg-subtle hover:bg-white cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            {/* 5. Line Total */}
                            <td className="px-4 py-2.5 align-middle text-right">
                              <div className={`font-mono font-extrabold text-sm tabular-numbers ${
                                isDone ? 'text-semantic-emerald' : 'text-semantic-amber'
                              }`}>
                                {formatIDR(lineTotal)}
                              </div>
                              <div className="text-[10px] font-mono text-mutedText">
                                {isDone ? 'Sudah Dialokasi' : 'Pending Review'}
                              </div>
                            </td>

                            {/* 6. Delete Action */}
                            <td className="p-1 text-center align-middle">
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task.id)}
                                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-mutedText hover:text-semantic-crimson hover:bg-red-50 transition-colors cursor-pointer"
                                title="Hapus task"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Subtotal Summary Footer */}
              <div className="bg-subtle border-t border-carbon p-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono gap-2">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-mutedText">Task Selesai: </span>
                    <strong className="text-semantic-emerald font-bold">{completedTasks.length} Task ({formatIDR(completedBountyTotal)})</strong>
                  </div>
                  <div>
                    <span className="text-mutedText">Task Proses: </span>
                    <strong className="text-semantic-amber font-bold">{pendingTasks.length} Task ({formatIDR(pendingBountyTotal)})</strong>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-mutedText">Take-Home Pay {activePerson.name}: </span>
                  <strong className="text-carbon font-extrabold text-sm ml-1 tabular-numbers">
                    {formatIDR(activePerson.baseSalary + completedBountyTotal)}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 bg-white border border-carbon p-12 text-center shadow-brutalist space-y-2">
            <p className="font-display font-extrabold text-base text-carbon uppercase">
              {personnel.length === 0 ? 'Direktori Personel Kosong' : 'Pilih Personel'}
            </p>
            <p className="font-ui text-xs text-mutedText max-w-sm mx-auto">
              {personnel.length === 0 
                ? 'Tambahkan personel di Tab [02] untuk mulai menetapkan task dan bounty komisi.' 
                : 'Pilih salah satu anggota tim di panel sebelah kiri untuk melihat ledger rincian task.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
