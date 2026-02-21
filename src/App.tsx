/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bike, 
  Gauge, 
  Zap, 
  Shield, 
  Info, 
  ChevronRight, 
  ChevronLeft,
  Filter, 
  X,
  Maximize2,
  Calendar,
  Activity,
  Plus,
  Trash2,
  Edit3,
  Save,
  Image as ImageIcon,
  Search,
  Loader2,
  Settings,
  Wrench,
  Upload
} from 'lucide-react';
import { Motorcycle, Category } from './constants';

const CATEGORIES: (Category | 'Semua')[] = [
  'Semua', 
  'Yamaha', 
  'Suzuki', 
  'Honda', 
  'Piaggio'
];

export default function App() {
  const [bikes, setBikes] = useState<Motorcycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<(Category | 'Semua')>('Semua');
  const [selectedBike, setSelectedBike] = useState<Motorcycle | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [editingBike, setEditingBike] = useState<Motorcycle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('url');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - 200 : scrollLeft + 200;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Form State
  const [formData, setFormData] = useState<Partial<Motorcycle>>({
    name: '',
    category: 'Yamaha',
    year: new Date().getFullYear(),
    description: '',
    modifications: '',
    image: 'https://i.pinimg.com/1200x/42/d2/e2/42d2e21b5b70311bd82633fbbcafc172.jpg',
    specs: {
      engine: '',
      power: '',
      torque: '',
      weight: '',
      topSpeed: ''
    }
  });

  useEffect(() => {
    fetchBikes();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file terlalu besar. Maksimal 5MB.');
      return;
    }

    setUploading(true);
    
    const reader = new FileReader();
    reader.onload = async () => {
      const base64String = reader.result as string;
      
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: base64String,
            fileName: file.name
          }),
        });

        const contentType = response.headers.get('content-type');
        if (response.ok && contentType?.includes('application/json')) {
          const data = await response.json();
          setFormData(prev => ({ ...prev, image: data.imageUrl }));
          showToast('Gambar berhasil diunggah');
        } else {
          const errorText = await response.text();
          console.error('Upload failed:', response.status, errorText);
          try {
            const errorJson = JSON.parse(errorText);
            alert(`Gagal mengunggah: ${errorJson.error || 'Terjadi kesalahan'}`);
          } catch {
            alert(`Gagal mengunggah: Server mengembalikan respon tidak valid (${response.status})`);
          }
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert('Terjadi kesalahan saat mengunggah.');
      } finally {
        setUploading(false);
      }
    };
    
    reader.onerror = () => {
      alert('Gagal membaca file.');
      setUploading(false);
    };
    
    reader.readAsDataURL(file);
  };

  const fetchBikes = async () => {
    try {
      const response = await fetch('/api/motorcycles');
      if (response.ok) {
        const data = await response.json();
        setBikes(data);
      }
    } catch (error) {
      console.error('Failed to fetch bikes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBikes = useMemo(() => {
    return bikes.filter(bike => {
      const matchesCategory = selectedCategory === 'Semua' || bike.category === selectedCategory;
      const matchesSearch = bike.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           bike.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           bike.modifications.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [bikes, selectedCategory, searchQuery]);

  const handleAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingBike) {
        const response = await fetch(`/api/motorcycles/${editingBike.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (response.ok) {
          setBikes(prev => prev.map(b => b.id === editingBike.id ? { ...formData, id: b.id } as Motorcycle : b));
          showToast('Karya kustom berhasil diperbarui');
        }
      } else {
        const newBike = {
          ...formData,
          id: Math.random().toString(36).substr(2, 9),
        } as Motorcycle;
        const response = await fetch('/api/motorcycles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newBike),
        });
        if (response.ok) {
          setBikes(prev => [newBike, ...prev]);
          showToast('Karya kustom baru berhasil dipublikasikan');
        }
      }
      closeForm();
    } catch (error) {
      console.error('Failed to save bike:', error);
      showToast('Gagal menyimpan data motor', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id) {
      console.error('Delete failed: No ID provided');
      return;
    }
    
    console.log('Attempting to delete bike with ID:', id);
    if (window.confirm('Apakah Anda yakin ingin menghapus motor ini dari showroom?')) {
      try {
        // Using POST for delete to avoid potential method restrictions
        const response = await fetch(`/api/motorcycles/${id}/delete`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('Delete response status:', response.status);
        if (response.ok) {
          setBikes(prev => prev.filter(b => b.id !== id));
          if (selectedBike?.id === id) setSelectedBike(null);
          showToast('Motor berhasil dihapus');
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Delete failed:', errorData);
          showToast(errorData.error || 'Gagal menghapus motor', 'error');
        }
      } catch (error) {
        console.error('Failed to delete bike:', error);
        showToast('Gagal menghapus data motor', 'error');
      }
    }
  };

  const openForm = (bike?: Motorcycle) => {
    if (bike) {
      setEditingBike(bike);
      setFormData(bike);
    } else {
      setEditingBike(null);
      setFormData({
        name: '',
        category: 'Yamaha',
        year: new Date().getFullYear(),
        description: '',
        modifications: '',
        image: 'https://i.pinimg.com/1200x/42/d2/e2/42d2e21b5b70311bd82633fbbcafc172.jpg',
        specs: {
          engine: '',
          power: '',
          torque: '',
          weight: '',
          topSpeed: ''
        }
      });
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingBike(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <button 
                onClick={() => setIsAboutOpen(true)}
                className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-105 transition-all"
              >
                <Settings className="text-black w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tighter uppercase leading-none">GARASITO</h1>
                <p className="text-[8px] sm:text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-0.5">semua motor kita tampung</p>
              </div>
            </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:block relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Cari motor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors w-48 lg:w-64"
              />
            </div>
            <button 
              onClick={() => openForm()}
              className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 bg-[length:200%_auto] hover:bg-right transition-all duration-500 text-black rounded-full text-[10px] sm:text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 sm:gap-2"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Tambah Custom</span>
              <span className="xs:hidden">Tambah</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <section className="mb-10 sm:mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl sm:rounded-3xl overflow-hidden aspect-[4/3] sm:aspect-video lg:aspect-[21/9] group"
          >
            <img 
              src="https://i.pinimg.com/1200x/42/d2/e2/42d2e21b5b70311bd82633fbbcafc172.jpg" 
              alt="Custom Garage Hero" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 sm:p-12 w-full">
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-block px-4 py-1 bg-gradient-to-r from-emerald-500 to-transparent text-black text-[8px] sm:text-[10px] font-extrabold uppercase tracking-widest rounded-l-full mb-3 sm:mb-4 border-l-2 border-emerald-400"
              >
                Custom Showroom
              </motion.span>
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-3 sm:mb-4 max-w-2xl leading-tight">
                Seni di Atas <span className="text-emerald-500 italic">Dua Roda.</span>
              </h2>
              <p className="text-zinc-400 max-w-lg text-xs sm:text-base leading-relaxed">
                Pamerkan mahakarya kustom Anda. Dari modifikasi mesin ekstrem hingga detail estetika yang presisi.
              </p>
            </div>
          </motion.div>
        </section>

        {/* Filters & Mobile Search */}
        <section className="mb-12 space-y-6">
          <div className="md:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Cari motor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-full py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors w-full"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="relative flex-1 max-w-full md:max-w-2xl group">
              {/* Left Arrow */}
              <button 
                onClick={() => scroll('left')}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-emerald-500/90 text-black border border-emerald-400/20 rounded-full flex items-center justify-center shadow-lg md:hidden transition-all active:scale-90"
                aria-label="Scroll Left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div 
                ref={scrollRef}
                className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide scroll-smooth px-10 md:px-0"
              >
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      selectedCategory === cat 
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-black shadow-lg shadow-emerald-500/20' 
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Right Arrow */}
              <button 
                onClick={() => scroll('right')}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-emerald-500/90 text-black border border-emerald-400/20 rounded-full flex items-center justify-center shadow-lg md:hidden transition-all active:scale-90"
                aria-label="Scroll Right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              
              {/* Gradient Fades */}
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0a0a0a] to-transparent pointer-events-none md:hidden" />
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0a0a0a] to-transparent pointer-events-none md:hidden" />
            </div>

            <div className="flex items-center gap-2 text-zinc-500 text-sm shrink-0">
              <Filter className="w-4 h-4" />
              <span>Menampilkan {filteredBikes.length} karya</span>
            </div>
          </div>
        </section>

        {/* Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {loading ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4 text-zinc-500">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
              <p className="font-medium">Membuka Showroom...</p>
            </div>
          ) : filteredBikes.length === 0 && searchQuery !== '' ? (
            <div className="col-span-full py-20 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-zinc-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Tidak ada hasil ditemukan</h3>
              <p className="text-zinc-500 mb-8">Coba kata kunci lain atau reset filter Anda.</p>
              <button 
                onClick={() => { setSearchQuery(''); setSelectedCategory('Semua'); }}
                className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-full text-sm transition-colors"
              >
                Reset Pencarian
              </button>
            </div>
          ) : (
            <>
              <AnimatePresence mode="popLayout">
                {filteredBikes.map((bike, index) => (
              <motion.div
                layout
                key={bike.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group relative bg-[#121212] border border-white/5 rounded-2xl overflow-hidden hover:border-emerald-500/50 transition-colors"
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img 
                    src={bike.image} 
                    alt={bike.name} 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=1000';
                    }}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider border border-white/10">
                      {bike.category}
                    </span>
                  </div>
                  
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); openForm(bike); }}
                      className="w-8 h-8 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-emerald-500 hover:text-black transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(bike.id, e)}
                      className="w-8 h-8 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button 
                    onClick={() => setSelectedBike(bike)}
                    className="absolute bottom-4 right-4 w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-500 hover:text-black"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold tracking-tight">{bike.name}</h3>
                    <span className="text-emerald-500 font-mono text-sm">{bike.year}</span>
                  </div>
                  <p className="text-zinc-500 text-sm line-clamp-2 mb-6">
                    {bike.description}
                  </p>
                  
                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-emerald-500" />
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase font-bold">Basis</p>
                          <p className="text-xs font-mono">{(bike.specs?.engine || '').split(' ')[0] || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase font-bold">Kustom</p>
                          <p className="text-xs font-mono truncate max-w-[80px]">{(bike.modifications || '').split(',')[0] || '-'}</p>
                        </div>
                      </div>
                    </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Add New Card Placeholder */}
          <motion.button
            onClick={() => openForm()}
            className="flex flex-col items-center justify-center gap-4 bg-[#121212] border-2 border-dashed border-white/5 rounded-2xl p-12 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-black transition-colors">
              <Plus className="w-8 h-8" />
            </div>
            <div className="text-center">
              <p className="font-bold text-zinc-300">Tambah Karya Kustom</p>
              <p className="text-xs text-zinc-500 mt-1">Pamerkan modifikasi Anda</p>
            </div>
          </motion.button>
            </>
          )}
        </section>
      </main>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedBike && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBike(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-6xl bg-[#121212] rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setSelectedBike(null)}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 w-8 h-8 sm:w-10 sm:h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-emerald-500 hover:text-black transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <div className="flex flex-col lg:flex-row h-full">
                <div className="lg:w-3/5 aspect-video lg:aspect-auto bg-zinc-900">
                  <img 
                    src={selectedBike.image} 
                    alt={selectedBike.name} 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=1000';
                    }}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="lg:w-2/5 p-6 sm:p-8 md:p-10 lg:p-12 overflow-y-auto">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-widest rounded-full border border-emerald-500/20">
                      {selectedBike.category}
                    </span>
                    <span className="text-zinc-500 text-[10px] sm:text-xs flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Build {selectedBike.year}
                    </span>
                  </div>
                  
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6 leading-tight">{selectedBike.name}</h2>
                  
                  <div className="space-y-8">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 border-b border-white/5 pb-2 mb-4">
                        Deskripsi Proyek
                      </h4>
                      <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
                        {selectedBike.description}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 border-b border-white/5 pb-2 mb-4">
                        Daftar Modifikasi
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {(selectedBike.modifications || '').split(',').filter(Boolean).map((mod, i) => (
                          <span key={i} className="px-2.5 py-1.5 bg-white/5 rounded-lg text-[10px] sm:text-xs text-zinc-300 border border-white/5">
                            {mod.trim()}
                          </span>
                        ))}
                        {!(selectedBike.modifications) && <span className="text-zinc-500 text-xs italic">Tidak ada modifikasi tercatat</span>}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 border-b border-white/5 pb-2 mb-4">
                        Spesifikasi Teknis
                      </h4>
                      <div className="grid grid-cols-2 gap-y-6 gap-x-4 sm:gap-x-8">
                        <SpecItem icon={<Gauge />} label="Mesin" value={selectedBike.specs?.engine || '-'} />
                        <SpecItem icon={<Zap />} label="Tenaga" value={selectedBike.specs?.power || '-'} />
                        <SpecItem icon={<Activity />} label="Torsi" value={selectedBike.specs?.torque || '-'} />
                        <SpecItem icon={<Shield />} label="Berat" value={selectedBike.specs?.weight || '-'} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 sm:mt-12 flex flex-wrap gap-3 sm:gap-4">
                    <button 
                      onClick={() => { 
                        const bikeToEdit = {...selectedBike};
                        setSelectedBike(null); 
                        setTimeout(() => openForm(bikeToEdit), 100);
                      }}
                      className="flex-1 min-w-[120px] py-3.5 sm:py-4 bg-white/5 border border-white/10 text-white text-sm font-bold rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Build
                    </button>
                    <button 
                      onClick={(e) => handleDelete(selectedBike.id, e)}
                      className="flex-1 min-w-[120px] py-3.5 sm:py-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold rounded-xl hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Hapus
                    </button>
                    <a 
                      href={`https://wa.me/?text=Halo Garasito, saya tertarik dengan build ${selectedBike.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-emerald-500 to-emerald-400 text-black text-sm font-bold rounded-xl hover:from-emerald-400 hover:to-emerald-300 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      Inquire Build
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* About Modal */}
      <AnimatePresence>
        {isAboutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAboutOpen(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#121212] rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 text-center"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
                <Settings className="text-black w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 tracking-tight">Tentang GARASITO</h2>
              <p className="text-zinc-400 text-sm sm:text-base leading-relaxed mb-8">
                GARASITO adalah platform pameran digital untuk para antusias motor kustom di Indonesia. 
                Kami percaya bahwa setiap motor memiliki cerita dan setiap modifikasi adalah bentuk seni yang patut diapresiasi.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8">
                <div className="p-3 sm:p-4 bg-white/5 rounded-xl sm:rounded-2xl border border-white/5">
                  <p className="text-xl sm:text-2xl font-bold text-emerald-500">{bikes.length}</p>
                  <p className="text-[8px] sm:text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Karya Terdaftar</p>
                </div>
                <div className="p-3 sm:p-4 bg-white/5 rounded-xl sm:rounded-2xl border border-white/5">
                  <p className="text-xl sm:text-2xl font-bold text-emerald-500">4</p>
                  <p className="text-[8px] sm:text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Brand Utama</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAboutOpen(false)}
                className="w-full py-3.5 sm:py-4 bg-gradient-to-r from-emerald-500 to-emerald-400 text-black font-bold rounded-xl hover:from-emerald-400 hover:to-emerald-300 transition-all text-sm sm:text-base shadow-lg shadow-emerald-500/20"
              >
                Tutup
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeForm}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-3xl bg-[#121212] rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
            >
              <div className="p-5 sm:p-8 border-b border-white/5 flex justify-between items-center bg-[#121212] z-10">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {editingBike ? 'Edit Karya Kustom' : 'Tambah Karya Baru'}
                </h2>
                <button onClick={closeForm} className="text-zinc-500 hover:text-white transition-colors p-1">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddOrEdit} className="p-5 sm:p-8 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Nama Proyek / Motor</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                      placeholder="Contoh: Harley Sportster 'Iron Maiden'"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Brand / Gaya</label>
                    <select 
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value as Category})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
                    >
                      {CATEGORIES.filter(c => c !== 'Semua').map(c => (
                        <option key={c} value={c} className="bg-[#121212]">{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Tahun Selesai Build</label>
                    <input 
                      type="number" 
                      value={formData.year}
                      onChange={e => setFormData({...formData, year: parseInt(e.target.value)})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-4 md:col-span-2">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Metode Input Gambar</label>
                      <div className="flex bg-white/5 p-1 rounded-lg">
                        <button 
                          type="button"
                          onClick={() => setUploadMethod('url')}
                          className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${uploadMethod === 'url' ? 'bg-emerald-500 text-black' : 'text-zinc-500 hover:text-white'}`}
                        >
                          Link URL
                        </button>
                        <button 
                          type="button"
                          onClick={() => setUploadMethod('file')}
                          className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${uploadMethod === 'file' ? 'bg-emerald-500 text-black' : 'text-zinc-500 hover:text-white'}`}
                        >
                          Unggah File
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                      <div className="md:col-span-2">
                        {uploadMethod === 'url' ? (
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase text-zinc-600 block">Masukkan Link Gambar (HTTPS)</label>
                            <div className="relative">
                              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                              <input 
                                type="url" 
                                value={formData.image}
                                onChange={e => setFormData({...formData, image: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                                placeholder="https://images.unsplash.com/..."
                              />
                              <p className="text-[9px] text-zinc-600 mt-2 italic">Gunakan link gambar dari Pinterest, Unsplash, atau hosting gambar lainnya.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase text-zinc-600 block">Pilih Gambar dari Galeri/Folder</label>
                            <div className="relative">
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="file-upload"
                              />
                              <label 
                                htmlFor="file-upload"
                                className={`flex flex-col items-center justify-center gap-3 w-full aspect-[16/9] bg-white/5 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-500/5 transition-all group ${uploading ? 'opacity-50 cursor-wait' : ''}`}
                              >
                                {uploading ? (
                                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                                    <Upload className="w-6 h-6" />
                                  </div>
                                )}
                                <div className="text-center">
                                  <p className="text-sm font-bold text-zinc-300">
                                    {uploading ? 'Sedang Mengunggah...' : 'Klik untuk Pilih Gambar'}
                                  </p>
                                  <p className="text-[10px] text-zinc-500 mt-1">Maksimal 5MB (JPG, PNG, WEBP)</p>
                                </div>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase text-zinc-600 block">Preview Gambar</label>
                        <div className="aspect-square rounded-2xl border border-white/10 overflow-hidden bg-white/5 relative group">
                          {formData.image ? (
                            <img 
                              src={formData.image} 
                              alt="Preview" 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=1000';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-700">
                              <ImageIcon className="w-12 h-12" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest">Tampilan Showroom</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 mb-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Deskripsi Proyek</label>
                    <textarea 
                      rows={3}
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                      placeholder="Ceritakan konsep dan inspirasi di balik build ini..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Daftar Modifikasi (Pisahkan dengan koma)</label>
                    <textarea 
                      rows={3}
                      value={formData.modifications}
                      onChange={e => setFormData({...formData, modifications: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                      placeholder="Contoh: S&S Carburetor, Custom Exhaust, Springer Fork..."
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 border-b border-white/5 pb-2">
                    Spesifikasi Teknis (Opsional)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-zinc-600">Mesin Basis</label>
                      <input 
                        type="text" 
                        value={formData.specs?.engine}
                        onChange={e => setFormData({...formData, specs: {...formData.specs!, engine: e.target.value}})}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                        placeholder="1200cc Evolution"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-zinc-600">Tenaga</label>
                      <input 
                        type="text" 
                        value={formData.specs?.power}
                        onChange={e => setFormData({...formData, specs: {...formData.specs!, power: e.target.value}})}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                        placeholder="68 HP"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-zinc-600">Torsi</label>
                      <input 
                        type="text" 
                        value={formData.specs?.torque}
                        onChange={e => setFormData({...formData, specs: {...formData.specs!, torque: e.target.value}})}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                        placeholder="96 Nm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-zinc-600">Berat</label>
                      <input 
                        type="text" 
                        value={formData.specs?.weight}
                        onChange={e => setFormData({...formData, specs: {...formData.specs!, weight: e.target.value}})}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                        placeholder="210 kg"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex gap-4">
                  <button 
                    type="button"
                    onClick={closeForm}
                    className="flex-1 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    disabled={saving || uploading}
                    className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-emerald-400 text-black font-bold rounded-xl hover:from-emerald-400 hover:to-emerald-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {editingBike ? 'Simpan Karya' : 'Publikasikan Karya'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border ${
              toast.type === 'success' ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-red-500 text-white border-red-400'
            }`}
          >
            {toast.type === 'success' ? <Shield className="w-4 h-4" /> : <Info className="w-4 h-4" />}
            <span className="text-sm font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center">
              <Bike className="text-emerald-500 w-5 h-5" />
            </div>
            <span className="font-bold tracking-tighter uppercase">GARASITO</span>
          </div>
          <p className="text-zinc-500 text-xs text-center md:text-left">
            © 2026 GARASITO. Panggung untuk Mahakarya Kustom Indonesia.
          </p>
          <div className="flex gap-6 text-zinc-400">
            <a href="#" className="hover:text-emerald-500 transition-colors"><Info className="w-5 h-5" /></a>
            <a href="#" className="hover:text-emerald-500 transition-colors"><Shield className="w-5 h-5" /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SpecItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 text-emerald-500">
        {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}
      </div>
      <div>
        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">{label}</p>
        <p className="text-sm font-mono text-zinc-200">{value}</p>
      </div>
    </div>
  );
}
