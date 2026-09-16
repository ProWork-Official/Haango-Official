import { useState } from 'react';
import { ImagePlus, Star, Trash2 } from 'lucide-react';
import { apiRequest } from '../lib/api';
import HaangoDialog from './HaangoDialog';

const ratings = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

export default function ReviewEditor({ bookingId, review = null, onSaved, onDeleted, onClose }) {
  const [rating, setRating] = useState(review?.rating || 5);
  const [comment, setComment] = useState(review?.comment || '');
  const [images, setImages] = useState(review?.images || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const readImages = async (event) => {
    const files = Array.from(event.target.files || []).slice(0, 2);
    const data = await Promise.all(files.map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })));
    setImages(data);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { rating, comment, images };
      const saved = review
        ? await apiRequest(`/reviews/${review._id}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : await apiRequest('/reviews', { method: 'POST', body: JSON.stringify({ ...payload, bookingId }) });
      onSaved(saved);
    } catch (saveError) {
      setError(saveError.message || 'Unable to save review.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!review) return;
    setConfirmDelete(false);
    setSaving(true);
    setError('');
    try {
      await apiRequest(`/reviews/${review._id}`, { method: 'DELETE' });
      onDeleted?.();
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete review.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <form onSubmit={submit} className="mt-4 rounded-2xl border border-ink-100 bg-ink-50 p-4">
      <div className="flex flex-wrap gap-2">
        {ratings.map((value) => <button type="button" key={value} onClick={() => setRating(value)} className={`rounded-xl px-3 py-2 text-sm font-semibold ${rating === value ? 'bg-coral-500 text-white' : 'bg-white text-ink-600'}`}><Star size={14} className="mr-1 inline fill-current" />{value}</button>)}
      </div>
      <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} placeholder="Write about your experience..." className="input-field mt-3 min-h-24 w-full" />
      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-600"><ImagePlus size={17} /> Add up to 2 images<input type="file" accept="image/*" multiple className="hidden" onChange={readImages} /></label>
      {images.length > 0 && <div className="mt-3 flex gap-2">{images.map((image) => <img key={image} src={image} alt="" className="h-16 w-16 rounded-xl object-cover" />)}</div>}
      {error && <p className="mt-2 text-sm text-error-600">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2"><button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : review ? 'Update review' : 'Publish review'}</button>{review && <button type="button" onClick={() => setConfirmDelete(true)} disabled={saving} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-error-600 hover:bg-error-50"><Trash2 size={16} /> Delete review</button>}{onClose && <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>}</div>
    </form>
    <HaangoDialog open={confirmDelete} title="Delete your review?" description="This review will be removed from the companion profile." confirmLabel="Delete review" tone="danger" onCancel={() => setConfirmDelete(false)} onConfirm={remove} />
    </>
  );
}
