import React, { useState } from 'react';
import { Personnel, TierConfig, TierId, TaskItem } from '../../types';
import { formatIDR } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  Lock, 
  Unlock, 
  UserPlus, 
  ChevronUp, 
  Trash2, 
  ArrowRight,
  RotateCcw,
  Users
} from 'lucide-react';

interface PersonnelRosterTabProps {
  personnel: Personnel[];
  tiers: TierConfig[];
  onUpdatePerson: (updatedPerson: Personnel) => void;
  onAddPerson: (newPerson: Personnel) => void;
  onDeletePerson: (personId: string) => void;
  onJumpToTaskLedger: (personId: string) => void;
  onResetToEmpty?: () => void;
  onLoadDemoData?: () => void;
}

export const PersonnelRosterTab: React.FC<PersonnelRosterTabProps> = ({
  personnel,
  tiers,
  onUpdatePerson,
  onAddPerson,
  onDeletePerson,
  onJumpToTaskLedger,
  onResetToEmpty,
  onLoadDemoData,
}) => {
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  // New person form state
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newTierId, setNewTierId] = useState<TierId>('TIER_02');
  const [newInitialSalary, setNewInitialSalary] = useState<string>('8000000');
  const [newInitialTaskTitle, setNewInitialTaskTitle] = useState('');
  const [newInitialTaskPrice, setNewInitialTaskPrice] = useState<string>('850000');

  const selectedTier = tiers.find((t) => t.id === newTierId) || tiers[1];

  const handleCreatePerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newRole.trim()) return;

    const parsedSalary = parseInt(newInitialSalary.replace(/[^0-9]/g, ''), 10) || selectedTier.currentFloor;
    const initialSalaryClamped = Math.max(parsedSalary, selectedTier.currentFloor);

    const initialTasks: TaskItem[] = [];
    if (newInitialTaskTitle.trim()) {
      const parsedPrice = parseInt(newInitialTaskPrice.replace(/[^0-9]/g, ''), 10) || 500000;
      initialTasks.push({
        id: `t_${Date.now()}_init`,
        title: newInitialTaskTitle.trim(),
        category: 'DEVELOPMENT',
        unitPrice: parsedPrice,
        quantity: 1,
        status: 'SELESAI',
        createdAt: new Date().toISOString().split('T')[0],
      });
    }

    const newPerson: Personnel = {
      id: `p_${Date.now()}`,
      name: newName.trim(),
      roleTitle: newRole.trim(),
      tierId: newTierId,
      isLocked: false,
      baseSalary: initialSalaryClamped,
      tasks: initialTasks,
    };

    onAddPerson(newPerson);

    // Reset form
    setNewName('');
    setNewRole('');
    setNewInitialTaskTitle('');
    setIsAddFormOpen(false);
  };

  const handleSalaryDelta = (person: Personnel, delta: number) => {
    if (person.isLocked) return;
    const tier = tiers.find((t) => t.id === person.tierId);
    const minFloor = tier ? tier.currentFloor : 100_000;
    const newSalary = Math.max(minFloor, person.baseSalary + delta);
    onUpdatePerson({
      ...person,
      baseSalary: newSalary,
    });
  };

  const handleSliderChange = (person: Personnel, value: number) => {
    if (person.isLocked) return;
    const tier = tiers.find((t) => t.id === person.tierId);
    const minFloor = tier ? tier.currentFloor : 100_000;
    onUpdatePerson({
      ...person,
      baseSalary: Math.max(minFloor, value),
    });
  };

  const handleTierChange = (person: Personnel, newTier: TierId) => {
    const tierConfig = tiers.find((t) => t.id === newTier);
    const minFloor = tierConfig ? tierConfig.currentFloor : 100_000;
    onUpdatePerson({
      ...person,
      tierId: newTier,
      baseSalary: Math.max(person.baseSalary, minFloor),
    });
  };

  const handleToggleLock = (person: Personnel) => {
    onUpdatePerson({
      ...person,
      isLocked: !person.isLocked,
    });
  };

  return (
    <div className="space-y-6">
      {/* SECTION HEADER & ADD BUTTON */}
      <div className="bg-white border border-carbon p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-brutalist">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-accent">ROSTER // 02</span>
            <h2 className="font-display font-extrabold text-lg uppercase tracking-tighter">
              Direktori Personel & Kontrol Gaji Pokok
            </h2>
          </div>
          <p className="text-xs text-mutedText font-ui mt-0.5">
            Kelola identitas, tier level, dan slider penyesuaian gaji pokok dengan jaminan tidak dapat berada di bawah floor tier aktif.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onResetToEmpty && personnel.length > 0 && (
            <Button
              variant="secondary"
              size="md"
              onClick={onResetToEmpty}
              className="text-semantic-crimson hover:bg-red-50 border-carbon"
              title="Kosongkan seluruh data personel"
            >
              <Trash2 className="w-4 h-4 text-semantic-crimson" />
              Reset Kosong
            </Button>
          )}

          {onLoadDemoData && personnel.length === 0 && (
            <Button
              variant="secondary"
              size="md"
              onClick={onLoadDemoData}
              title="Muat data contoh"
            >
              <RotateCcw className="w-4 h-4 text-accent" />
              Muat Data Demo
            </Button>
          )}

          <Button
            variant={isAddFormOpen ? 'secondary' : 'primary'}
            size="md"
            onClick={() => setIsAddFormOpen(!isAddFormOpen)}
            className="shrink-0"
          >
            {isAddFormOpen ? (
              <>
                <ChevronUp className="w-4 h-4 text-carbon" />
                Tutup Formulir
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 text-accent" />
                + Tambah Personel & Role
              </>
            )}
          </Button>
        </div>
      </div>

      {/* COLLAPSIBLE ADD PERSON FORM */}
      {isAddFormOpen && (
        <form
          onSubmit={handleCreatePerson}
          className="bg-white border-2 border-carbon p-5 shadow-brutalist space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-carbon pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-accent inline-block border border-carbon" />
              <h3 className="font-display font-extrabold text-sm uppercase tracking-tight">
                Formulir Pendaftaran Personel Baru
              </h3>
            </div>
            <Badge variant="accent" size="sm">INPUT PROTOCOL</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-carbon mb-1">
                Nama Lengkap *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Raditya Maulana"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 bg-subtle border border-carbon text-sm font-ui focus:bg-white focus:outline-none focus:ring-1 focus:ring-carbon"
              />
            </div>

            {/* Custom Role Title */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-carbon mb-1">
                Role Title Spesifik *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Senior Fullstack Engineer"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 bg-subtle border border-carbon text-sm font-ui focus:bg-white focus:outline-none focus:ring-1 focus:ring-carbon"
              />
            </div>

            {/* Tier Selection */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-carbon mb-1">
                Tier Level Guardrail *
              </label>
              <select
                value={newTierId}
                onChange={(e) => {
                  const tId = e.target.value as TierId;
                  setNewTierId(tId);
                  const matched = tiers.find((t) => t.id === tId);
                  if (matched) setNewInitialSalary(matched.currentFloor.toString());
                }}
                className="w-full px-3 py-2 bg-subtle border border-carbon text-sm font-mono font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-carbon"
              >
                {tiers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (Min: {formatIDR(t.currentFloor)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-carbon/20">
            {/* Initial Base Salary */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-carbon mb-1">
                Gaji Pokok Awal (IDR)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={new Intl.NumberFormat('id-ID').format(parseInt(newInitialSalary || '0', 10))}
                onChange={(e) => setNewInitialSalary(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-3 py-2 bg-subtle border border-carbon text-sm font-mono font-bold tabular-numbers focus:bg-white focus:outline-none focus:ring-1 focus:ring-carbon"
              />
              <p className="text-[10px] font-mono text-mutedText mt-1">
                Min floor {selectedTier.code}: {formatIDR(selectedTier.currentFloor)}
              </p>
            </div>

            {/* Optional Initial Task Title */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-carbon mb-1">
                Task Perdana (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: Setup CI/CD Pipeline GitHub"
                value={newInitialTaskTitle}
                onChange={(e) => setNewInitialTaskTitle(e.target.value)}
                className="w-full px-3 py-2 bg-subtle border border-carbon text-sm font-ui focus:bg-white focus:outline-none focus:ring-1 focus:ring-carbon"
              />
            </div>

            {/* Optional Initial Task Price */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-carbon mb-1">
                Bounty Task Perdana (IDR)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={new Intl.NumberFormat('id-ID').format(parseInt(newInitialTaskPrice || '0', 10))}
                onChange={(e) => setNewInitialTaskPrice(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-3 py-2 bg-subtle border border-carbon text-sm font-mono font-bold tabular-numbers focus:bg-white focus:outline-none focus:ring-1 focus:ring-carbon"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsAddFormOpen(false)}
            >
              Batalkan
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="md"
            >
              Simpan & Masukkan ke Roster
            </Button>
          </div>
        </form>
      )}

      {/* ROSTER TABLE (COMPLIANT WITH RESPONSIVE-TABLE MODERN WEB GUIDELINES) */}
      <div className="bg-white border border-carbon shadow-brutalist overflow-hidden">
        <div
          tabIndex={0}
          role="region"
          aria-labelledby="roster-table-caption"
          className="table-wrapper overflow-x-auto max-w-full"
        >
          <table className="w-full border-collapse text-left">
            <caption id="roster-table-caption" className="sr-only">
              Daftar personel tim beserta tier guardrail dan kontrol gaji pokok
            </caption>
            <thead className="bg-subtle border-b border-carbon sticky top-0 z-10">
              <tr className="divide-x divide-carbon">
                <th scope="col" className="px-3 py-2.5 text-[11px] font-mono font-bold uppercase text-carbon w-12 text-center">
                  LOCK
                </th>
                <th scope="col" className="px-4 py-2.5 text-[11px] font-mono font-bold uppercase text-carbon">
                  Personel & Role Title
                </th>
                <th scope="col" className="px-3 py-2.5 text-[11px] font-mono font-bold uppercase text-carbon w-44">
                  Tier Guardrail
                </th>
                <th scope="col" className="px-4 py-2.5 text-[11px] font-mono font-bold uppercase text-carbon min-w-[280px]">
                  Kontrol Slider Gaji Pokok
                </th>
                <th scope="col" className="px-3 py-2.5 text-[11px] font-mono font-bold uppercase text-carbon w-36 text-center">
                  Bounty Selesai
                </th>
                <th scope="col" className="px-3 py-2.5 text-[11px] font-mono font-bold uppercase text-carbon w-14 text-center">
                  HAPUS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-carbon">
              {personnel.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center bg-white">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 bg-subtle border border-carbon flex items-center justify-center shadow-brutalist-sm">
                        <Users className="w-6 h-6 text-carbon" />
                      </div>
                      <span className="font-display font-extrabold text-base text-carbon uppercase tracking-tight">
                        Direktori Personel Kosong
                      </span>
                      <p className="font-ui text-xs text-mutedText max-w-md">
                        Seluruh data personel telah dikosongkan. Mulai daftarkan personel baru menggunakan tombol di bawah atau muat kembali paket contoh demo.
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="accent"
                          size="md"
                          onClick={() => setIsAddFormOpen(true)}
                        >
                          <UserPlus className="w-4 h-4 text-white" />
                          + Tambah Personel Pertama
                        </Button>
                        {onLoadDemoData && (
                          <Button
                            variant="secondary"
                            size="md"
                            onClick={onLoadDemoData}
                          >
                            <RotateCcw className="w-4 h-4 text-accent" />
                            Muat Data Demo
                          </Button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                personnel.map((person) => {
                  const tier = tiers.find((t) => t.id === person.tierId) || tiers[2];
                  const completedTasks = person.tasks.filter((t) => t.status === 'SELESAI');
                  const completedBounty = completedTasks.reduce((sum, t) => sum + t.unitPrice * t.quantity, 0);
                  const isClampedAtFloor = person.baseSalary <= tier.currentFloor;

                  return (
                    <tr
                      key={person.id}
                      className={`divide-x divide-carbon transition-colors ${
                        person.isLocked ? 'bg-paper/60' : 'hover:bg-subtle/30'
                      }`}
                    >
                    {/* 1. Lock / Unlock Toggle Button (min 44x44px target) */}
                    <td className="p-1 text-center align-middle">
                      <button
                        type="button"
                        onClick={() => handleToggleLock(person)}
                        title={person.isLocked ? 'Buka Kunci Gaji' : 'Kunci Gaji Pokok'}
                        className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center border border-carbon transition-all cursor-pointer select-none ${
                          person.isLocked
                            ? 'bg-carbon text-white shadow-brutalist-sm'
                            : 'bg-white text-mutedText hover:text-carbon hover:bg-subtle'
                        }`}
                        aria-label={person.isLocked ? `Buka kunci ${person.name}` : `Kunci ${person.name}`}
                      >
                        {person.isLocked ? (
                          <Lock className="w-4 h-4 text-accent" />
                        ) : (
                          <Unlock className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {/* 2. Person Identity & Custom Role Title */}
                    <td className="px-4 py-3 align-middle">
                      <div className="font-ui font-semibold text-sm text-carbon leading-snug">
                        {person.name}
                      </div>
                      <div className="text-xs text-mutedText font-ui mt-0.5 leading-snug flex items-center gap-1.5">
                        <span>{person.roleTitle}</span>
                        {person.isLocked && (
                          <span className="text-[10px] font-mono text-accent font-bold">[LOCKED]</span>
                        )}
                      </div>
                    </td>

                    {/* 3. Tier Selection */}
                    <td className="px-3 py-3 align-middle">
                      <select
                        value={person.tierId}
                        disabled={person.isLocked}
                        onChange={(e) => handleTierChange(person, e.target.value as TierId)}
                        className="w-full text-xs font-mono font-bold bg-subtle border border-carbon px-2 py-1.5 focus:bg-white focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                        aria-label={`Tier untuk ${person.name}`}
                      >
                        {tiers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.code} ({formatIDR(t.currentFloor)})
                          </option>
                        ))}
                      </select>
                      <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-mutedText">
                        <span>Floor: {formatIDR(tier.currentFloor)}</span>
                        <span>{tier.weight.toFixed(1)}x</span>
                      </div>
                    </td>

                    {/* 4. Base Salary Slider & Tactile Steppers */}
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-base text-carbon tabular-numbers">
                            {formatIDR(person.baseSalary)}
                          </span>
                          {isClampedAtFloor && (
                            <span className="text-[10px] font-mono px-1 py-0.2 bg-amber-100 text-semantic-amber border border-semantic-amber font-bold">
                              FLOOR
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-mutedText">
                          Batas: {formatIDR(tier.currentFloor)} - 35Jt
                        </span>
                      </div>

                      {/* Slider */}
                      <input
                        type="range"
                        min={tier.currentFloor}
                        max={35_000_000}
                        step={100_000}
                        value={person.baseSalary}
                        disabled={person.isLocked}
                        onChange={(e) => handleSliderChange(person, parseInt(e.target.value, 10))}
                        className="w-full disabled:opacity-40"
                        aria-label={`Slider gaji pokok ${person.name}`}
                      />

                      {/* Steppers: -1Jt, -250Rb, -100Rb, +100Rb, +250Rb, +1Jt (min 44px touch targets) */}
                      <div className="flex items-center gap-1 mt-2">
                        <button
                          type="button"
                          disabled={person.isLocked || person.baseSalary <= tier.currentFloor}
                          onClick={() => handleSalaryDelta(person, -1_000_000)}
                          className="min-h-[44px] flex-1 px-1.5 py-1 text-xs font-mono font-bold border border-carbon bg-subtle hover:bg-white text-carbon disabled:opacity-30 disabled:cursor-not-allowed active:bg-gray-200 transition-colors cursor-pointer"
                        >
                          -1 Jt
                        </button>
                        <button
                          type="button"
                          disabled={person.isLocked || person.baseSalary <= tier.currentFloor}
                          onClick={() => handleSalaryDelta(person, -250_000)}
                          className="min-h-[44px] flex-1 px-1.5 py-1 text-xs font-mono font-bold border border-carbon bg-subtle hover:bg-white text-carbon disabled:opacity-30 disabled:cursor-not-allowed active:bg-gray-200 transition-colors cursor-pointer"
                        >
                          -250 Rb
                        </button>
                        <button
                          type="button"
                          disabled={person.isLocked || person.baseSalary <= tier.currentFloor}
                          onClick={() => handleSalaryDelta(person, -100_000)}
                          className="min-h-[44px] flex-1 px-1.5 py-1 text-xs font-mono font-bold border border-carbon bg-subtle hover:bg-white text-carbon disabled:opacity-30 disabled:cursor-not-allowed active:bg-gray-200 transition-colors cursor-pointer"
                        >
                          -100 Rb
                        </button>
                        <button
                          type="button"
                          disabled={person.isLocked}
                          onClick={() => handleSalaryDelta(person, 100_000)}
                          className="min-h-[44px] flex-1 px-1.5 py-1 text-xs font-mono font-bold border border-carbon bg-subtle hover:bg-white text-carbon disabled:opacity-30 disabled:cursor-not-allowed active:bg-gray-200 transition-colors cursor-pointer"
                        >
                          +100 Rb
                        </button>
                        <button
                          type="button"
                          disabled={person.isLocked}
                          onClick={() => handleSalaryDelta(person, 250_000)}
                          className="min-h-[44px] flex-1 px-1.5 py-1 text-xs font-mono font-bold border border-carbon bg-subtle hover:bg-white text-carbon disabled:opacity-30 disabled:cursor-not-allowed active:bg-gray-200 transition-colors cursor-pointer"
                        >
                          +250 Rb
                        </button>
                        <button
                          type="button"
                          disabled={person.isLocked}
                          onClick={() => handleSalaryDelta(person, 1_000_000)}
                          className="min-h-[44px] flex-1 px-1.5 py-1 text-xs font-mono font-bold border border-carbon bg-subtle hover:bg-white text-carbon disabled:opacity-30 disabled:cursor-not-allowed active:bg-gray-200 transition-colors cursor-pointer"
                        >
                          +1 Jt
                        </button>
                      </div>
                    </td>

                    {/* 5. Task Counter Pill (Click jumps directly to Tab 3 filtered to person) */}
                    <td className="px-3 py-3 align-middle text-center">
                      <button
                        type="button"
                        onClick={() => onJumpToTaskLedger(person.id)}
                        title={`Buka task bounty untuk ${person.name}`}
                        className="w-full min-h-[44px] p-2 bg-emerald-50 hover:bg-emerald-100 border border-semantic-emerald text-semantic-emerald transition-all text-left flex flex-col justify-center cursor-pointer select-none group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold tracking-tight">
                            {completedTasks.length} SELESAI
                          </span>
                          <ArrowRight className="w-3 h-3 text-semantic-emerald group-hover:translate-x-0.5 transition-transform" />
                        </div>
                        <div className="font-mono font-extrabold text-xs tabular-numbers mt-0.5">
                          {formatIDR(completedBounty)}
                        </div>
                      </button>
                    </td>

                    {/* 6. Delete Action */}
                    <td className="p-1 text-center align-middle">
                      <button
                        type="button"
                        onClick={() => onDeletePerson(person.id)}
                        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-mutedText hover:text-semantic-crimson hover:bg-red-50 transition-colors cursor-pointer"
                        title={`Hapus ${person.name}`}
                        aria-label={`Hapus ${person.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>

        {/* Footer info strip */}
        <div className="bg-subtle border-t border-carbon px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono text-mutedText gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-accent inline-block" />
            <span>Total Terdaftar: <strong className="text-carbon">{personnel.length} Personel</strong></span>
          </div>
          <div>
            <span>Klik kartu bounty selesai untuk langsung mengaudit task personel tersebut di Tab [03].</span>
          </div>
        </div>
      </div>
    </div>
  );
};
