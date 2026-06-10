'use client';

import { useState, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { useUpdateProfile, useChangePassword } from '@/hooks/useAuth';
import { Avatar, AVATAR_LIST, AvatarId } from '@/components/ui/Avatar';
import { toast } from '@/lib/toast';

const INPUT = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-500 disabled:opacity-50';

// Centre-crop file to a 200×200 JPEG and return a data URL
function cropToSquare(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const size = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('canvas not available')); return; }

      const x = (img.width - size) / 2;
      const y = (img.height - size) / 2;
      ctx.drawImage(img, x, y, size, size, 0, 0, 200, 200);

      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

export default function Account() {
  const { user } = useStore();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedAvatar, setSelectedAvatar] = useState<string | null | undefined>(user?.avatar);
  const [name, setName] = useState(user?.name ?? '');
  const [uploading, setUploading] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');

  const techAvatars = AVATAR_LIST.filter(a => a.category === 'tech');
  const financeAvatars = AVATAR_LIST.filter(a => a.category === 'finance');

  const isCustomImage = selectedAvatar?.startsWith('data:') || selectedAvatar?.startsWith('http');

  const handleAvatarSelect = async (id: AvatarId) => {
    setSelectedAvatar(id);
    await updateProfile.mutateAsync({ avatar: id });
    toast('Avatar updated');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Please select an image file', 'error'); return; }

    setUploading(true);
    try {
      const dataUrl = await cropToSquare(file);
      setSelectedAvatar(dataUrl);
      await updateProfile.mutateAsync({ avatar: dataUrl });
      toast('Avatar updated');
    } catch {
      toast('Failed to process image', 'error');
    } finally {
      setUploading(false);
      // reset so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveName = async () => {
    await updateProfile.mutateAsync({ name: name || undefined });
    toast('Profile saved');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return; }
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    try {
      await changePassword.mutateAsync({ currentPassword: currentPw, newPassword: newPw });
      toast('Password changed');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Something went wrong';
      setPwError(msg);
    }
  };

  return (
    <div className="space-y-8">

      {/* ── Avatar ─────────────────────────────────────────────────────────── */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-6">
        <h2 className="text-sm font-semibold text-gray-300">Avatar</h2>

        {/* Current avatar + upload */}
        <div className="flex items-center gap-5">
          <div className="relative group flex-shrink-0">
            <Avatar id={selectedAvatar} size={80} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Upload a photo"
              className="absolute inset-0 rounded-full bg-black/55 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-0.5 transition-opacity disabled:cursor-wait"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className="w-5 h-5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span className="text-white text-[10px] font-medium leading-none">
                {uploading ? 'Processing…' : 'Upload'}
              </span>
            </button>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-sm text-brand-400 hover:text-brand-300 font-medium transition-colors disabled:opacity-50"
            >
              {uploading ? 'Processing…' : 'Upload a photo'}
            </button>
            <p className="text-xs text-gray-500">JPG, PNG or GIF · cropped to square · max ~5 MB</p>
            {isCustomImage && (
              <button
                onClick={() => handleAvatarSelect('default' as AvatarId)}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                Remove custom photo
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Premade grid */}
        <div className="border-t border-gray-800 pt-5 space-y-4">
          <p className="text-xs text-gray-400">Or choose a premade avatar</p>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-600 mb-2 uppercase tracking-wide">Tech</p>
              <div className="flex gap-2 flex-wrap">
                {techAvatars.map(a => (
                  <button
                    key={a.id}
                    onClick={() => handleAvatarSelect(a.id)}
                    title={a.label}
                    className={`rounded-full transition-all focus:outline-none ${
                      !isCustomImage && selectedAvatar === a.id
                        ? 'ring-2 ring-brand-400 ring-offset-2 ring-offset-gray-900'
                        : 'opacity-55 hover:opacity-100'
                    }`}
                  >
                    <Avatar id={a.id} size={44} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-600 mb-2 uppercase tracking-wide">Finance</p>
              <div className="flex gap-2 flex-wrap">
                {financeAvatars.map(a => (
                  <button
                    key={a.id}
                    onClick={() => handleAvatarSelect(a.id)}
                    title={a.label}
                    className={`rounded-full transition-all focus:outline-none ${
                      !isCustomImage && selectedAvatar === a.id
                        ? 'ring-2 ring-brand-400 ring-offset-2 ring-offset-gray-900'
                        : 'opacity-55 hover:opacity-100'
                    }`}
                  >
                    <Avatar id={a.id} size={44} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Display name ───────────────────────────────────────────────────── */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-300">Display Name</h2>
          <p className="text-xs text-gray-500 mt-0.5">Shown in the sidebar and across the app</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={user?.email ?? 'Your name'}
            className={INPUT}
          />
          <button
            onClick={handleSaveName}
            disabled={updateProfile.isPending}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            {updateProfile.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </section>

      {/* ── Email ──────────────────────────────────────────────────────────── */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Email</h2>
        <div className="space-y-1 text-sm text-gray-400">
          <p>{user?.email}</p>
          <p className="text-xs text-gray-600">Email cannot be changed</p>
        </div>
      </section>

      {/* ── Change password ────────────────────────────────────────────────── */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-300">Change Password</h2>
          <p className="text-xs text-gray-500 mt-0.5">Must be at least 8 characters</p>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Current password</label>
            <input type="password" required value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              placeholder="••••••••" className={INPUT} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">New password</label>
            <input type="password" required value={newPw}
              onChange={e => setNewPw(e.target.value)}
              placeholder="At least 8 characters" className={INPUT} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Confirm new password</label>
            <input type="password" required value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="••••••••" className={INPUT} />
          </div>
          {pwError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {pwError}
            </p>
          )}
          <button
            type="submit"
            disabled={changePassword.isPending}
            className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            {changePassword.isPending ? 'Saving…' : 'Change password'}
          </button>
        </form>
      </section>

    </div>
  );
}
