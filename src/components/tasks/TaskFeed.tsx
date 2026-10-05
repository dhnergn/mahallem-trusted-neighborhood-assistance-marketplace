import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  MapPin,
  RefreshCw,
  SlidersHorizontal,
  PackageOpen,
  ArrowUpDown,
} from 'lucide-react';
import { TaskDiscoveryCard } from '../../types/index.ts';
import { TaskCard } from './TaskCard.tsx';
import { api } from '../../api/client.ts';
import { TASK_CATEGORIES } from '../../lib/task-policy.ts';

interface TaskFeedProps {
  onSelectTask: (task: TaskDiscoveryCard) => void;
  onOpenRequesterTrust: (userId: string) => void;
  refreshKey: number;
}

export const TaskFeed: React.FC<TaskFeedProps> = ({
  onSelectTask,
  onOpenRequesterTrust,
  refreshKey,
}) => {
  const [tasks, setTasks] = useState<TaskDiscoveryCard[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchTasks = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.getTasks({
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        district: selectedDistrict === 'all' ? undefined : selectedDistrict,
        radius: maxDistanceKm,
      });
      setTasks(res.tasks);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load neighborhood tasks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedCategory, selectedDistrict, maxDistanceKm, refreshKey]);

  const filteredTasks = tasks.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.neighborhood.toLowerCase().includes(q) ||
      t.district.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Search & Proximity Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Text Search */}
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by neighborhood, item, or route..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* District & Distance selector */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* District dropdown */}
            <select
              value={selectedDistrict}
              onChange={e => setSelectedDistrict(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Districts</option>
              <option value="Kadıköy">Kadıköy</option>
              <option value="Beşiktaş">Beşiktaş</option>
              <option value="Üsküdar">Üsküdar</option>
            </select>

            {/* Distance dropdown */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Within</span>
              <select
                value={maxDistanceKm}
                onChange={e => setMaxDistanceKm(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-900 focus:outline-none"
              >
                <option value={2}>2 km</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={20}>20 km</option>
              </select>
            </div>

            {/* Refresh button */}
            <button
              onClick={fetchTasks}
              disabled={isLoading}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Refresh discovery feed"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-colors ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Categories
          </button>
          {TASK_CATEGORIES.filter(c => c.policy !== 'PROHIBITED').map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-emerald-700 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between px-1">
        <div className="text-xs text-slate-500 font-medium">
          Showing <strong className="text-slate-800">{filteredTasks.length}</strong> active requests nearby
        </div>
        <div className="text-[11px] text-slate-400">
          Locations quantized with ~500m privacy jitter
        </div>
      </div>

      {/* Task Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(idx => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-100 p-5 h-56 animate-pulse flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-24 h-5 bg-slate-200 rounded-md" />
                <div className="w-3/4 h-6 bg-slate-200 rounded-md" />
                <div className="w-full h-4 bg-slate-100 rounded-md" />
              </div>
              <div className="w-full h-8 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-md mx-auto space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <PackageOpen className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-800">No requests found nearby</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Try broadening your distance filter or changing district. You can also be the first to request help in this area!
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSelectedDistrict('all');
              setMaxDistanceKm(20);
            }}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onSelect={onSelectTask}
              onOpenRequesterTrust={onOpenRequesterTrust}
            />
          ))}
        </div>
      )}
    </div>
  );
};
