import React, { useState, useRef } from 'react';
import {
  Plus,
  Heart,
  Calendar,
  MapPin,
  Trash2,
  FolderHeart,
  X,
  Upload,
  Sparkles,
  Download,
} from 'lucide-react';
import { PhotoItem, UserProfile } from '../types';

interface PhotoAlbumsProps {
  photos: PhotoItem[];
  currentUser: UserProfile;
  onAddPhoto: (photo: Omit<PhotoItem, 'id' | 'senderId' | 'senderName' | 'timestamp' | 'likes'>) => void;
  onToggleLike: (photoId: string) => void;
  onDeletePhoto: (photoId: string) => void;
}

export const PhotoAlbums: React.FC<PhotoAlbumsProps> = ({
  photos,
  currentUser,
  onAddPhoto,
  onToggleLike,
  onDeletePhoto,
}) => {
  const [selectedAlbum, setSelectedAlbum] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [activePhoto, setActivePhoto] = useState<PhotoItem | null>(null);

  // Form states
  const [photoUrl, setPhotoUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [albumName, setAlbumName] = useState('Our Memories');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Extract unique album names
  const albumNames = ['All', ...Array.from(new Set(photos.map((p) => p.albumName || 'Our Memories')))];

  const filteredPhotos =
    selectedAlbum === 'All'
      ? photos
      : photos.filter((p) => (p.albumName || 'Our Memories') === selectedAlbum);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      if (dataUrl) {
        setPhotoUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrl) return;

    onAddPhoto({
      url: photoUrl,
      caption: caption.trim() || 'A sweet memory together 💕',
      albumName: albumName.trim() || 'Our Memories',
      location: location.trim() || undefined,
      date: date || new Date().toISOString().split('T')[0],
    });

    setPhotoUrl('');
    setCaption('');
    setLocation('');
    setShowAddModal(false);
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      {/* Album Header & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-rose-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FolderHeart className="w-6 h-6 text-rose-500" />
            <span>Shared Scrapbook & Photo Albums</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Preserve your polaroid memories and shared moments across the miles.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-bold rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Memory
        </button>
      </div>

      {/* Album Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {albumNames.map((album) => (
          <button
            key={album}
            onClick={() => setSelectedAlbum(album)}
            className={`px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedAlbum === album
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-white/80 hover:bg-rose-50 text-slate-700 border border-rose-100'
            }`}
          >
            {album === 'All' ? '🌟 All Memories' : `📁 ${album}`} (
            {album === 'All'
              ? photos.length
              : photos.filter((p) => (p.albumName || 'Our Memories') === album).length}
            )
          </button>
        ))}
      </div>

      {/* Photo Grid (Polaroid Style) */}
      {filteredPhotos.length === 0 ? (
        <div className="bg-white/80 rounded-3xl p-12 text-center border border-dashed border-rose-200">
          <FolderHeart className="w-12 h-12 text-rose-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No photos in this album yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Upload snapshots from your trips, video call screenshots, or sweet moments to cherish forever!
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Upload First Memory 📸
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
          {filteredPhotos.map((photo, index) => {
            const hasLiked = photo.likes?.includes(currentUser.id);
            // Slight playful tilt for polaroid charm
            const tiltAngle = (index % 3 - 1) * 1.5;

            return (
              <div
                key={photo.id}
                style={{ transform: `rotate(${tiltAngle}deg)` }}
                className="bg-white p-3.5 pb-5 rounded-2xl shadow-md hover:shadow-xl border border-rose-100/80 transition-all duration-300 hover:scale-102 flex flex-col justify-between group"
              >
                {/* Photo image frame */}
                <div
                  className="w-full aspect-square rounded-xl overflow-hidden bg-slate-100 relative cursor-pointer group/img"
                  onClick={() => setActivePhoto(photo)}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-xs font-semibold text-white bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-xs">
                      View Memory
                    </span>
                  </div>
                </div>

                {/* Polaroid caption & details */}
                <div className="pt-3 px-1 flex flex-col gap-1">
                  <p className="font-handwriting text-lg text-slate-800 leading-snug line-clamp-2">
                    {photo.caption}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-rose-50">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-rose-400" />
                      <span>{photo.date}</span>
                      {photo.location && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-3 h-3 text-rose-400" />
                            {photo.location}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Like button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLike(photo.id);
                      }}
                      className="flex items-center gap-1 text-xs cursor-pointer hover:scale-110 transition-transform"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          hasLiked ? 'text-rose-500 fill-rose-500 animate-bounce' : 'text-slate-300 hover:text-rose-400'
                        }`}
                      />
                      <span className="font-bold text-slate-600 text-[11px]">
                        {photo.likes?.length || 0}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Memory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-rose-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-rose-500" />
                Add Shared Memory
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePhoto} className="space-y-3.5">
              {/* Photo Upload or URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Photo</label>
                {photoUrl ? (
                  <div className="relative rounded-2xl overflow-hidden max-h-48 bg-slate-100 border border-rose-200">
                    <img src={photoUrl} alt="Preview" className="w-full h-48 object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-lg hover:bg-black/80"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 p-6 border-2 border-dashed border-rose-200 hover:border-rose-400 rounded-2xl bg-rose-50/40 hover:bg-rose-50/70 transition-all text-xs font-semibold text-rose-600 cursor-pointer"
                    >
                      <Upload className="w-5 h-5" />
                      Choose Photo from Device
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Or image URL:</span>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={photoUrl}
                        onChange={(e) => setPhotoUrl(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Caption */}
              <div>
                <label className="text-xs font-semibold text-slate-700">Caption / Sweet Note</label>
                <input
                  type="text"
                  placeholder="e.g. Can't stop smiling when I look at this 🥰"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>

              {/* Album Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Album Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Our Trips"
                    value={albumName}
                    onChange={(e) => setAlbumName(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Date Taken</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full mt-1 px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="text-xs font-semibold text-slate-700">Location (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Central Park or Virtual FaceTime"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!photoUrl}
                  className="px-5 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md disabled:opacity-50 cursor-pointer"
                >
                  Save to Album ✨
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox / Zoom View */}
      {activePhoto && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-white rounded-3xl p-4 shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">
                📁 {activePhoto.albumName || 'Our Memories'}
              </span>
              <div className="flex items-center gap-1">
                <a
                  href={activePhoto.url}
                  download="lovebirds-memory.png"
                  className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => {
                    onDeletePhoto(activePhoto.id);
                    setActivePhoto(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActivePhoto(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden max-h-[65vh] bg-slate-900 flex items-center justify-center">
              <img
                src={activePhoto.url}
                alt={activePhoto.caption}
                className="max-h-[65vh] w-full object-contain"
              />
            </div>

            <div className="pt-3">
              <p className="font-handwriting text-2xl text-slate-900">{activePhoto.caption}</p>
              <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                <div className="flex items-center gap-2">
                  <span>📅 {activePhoto.date}</span>
                  {activePhoto.location && <span>📍 {activePhoto.location}</span>}
                  <span>• By {activePhoto.senderName}</span>
                </div>
                <button
                  onClick={() => onToggleLike(activePhoto.id)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 font-bold hover:bg-rose-100 cursor-pointer"
                >
                  <Heart
                    className={`w-4 h-4 ${
                      activePhoto.likes?.includes(currentUser.id) ? 'fill-rose-500' : ''
                    }`}
                  />
                  <span>{activePhoto.likes?.length || 0} loves</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
