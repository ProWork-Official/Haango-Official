import { useEffect, useState } from 'react';
import { ArrowLeft, ImagePlus, Newspaper, Pencil, Plus, Trash2, X } from 'lucide-react';
import { apiRequest } from '../lib/api';
import AdminLayout from '../Components/AdminLayout';

const emptyDraft = { title: '', body: '', image: '' };
const maxImageLength = 2_000_000;

const formatCreatedAt = (value) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value));

function compressImage(file) {
  if (!file.type.startsWith('image/')) return Promise.reject(new Error('Choose an image file.'));

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read the selected image.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Unable to process the selected image.'));
      image.onload = () => {
        const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Image processing is unavailable in this browser.'));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        if (dataUrl.length > maxImageLength) {
          reject(new Error('The image is too large after compression. Choose a smaller image.'));
          return;
        }
        resolve(dataUrl);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function AdminBlogsPage({ onNavigate }) {
  const [blogs, setBlogs] = useState([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadBlogs = async () => {
    const result = await apiRequest('/admin/blogs');
    setBlogs(Array.isArray(result) ? result : []);
  };

  useEffect(() => {
    let active = true;
    apiRequest('/admin/blogs')
      .then((result) => {
        if (active) setBlogs(Array.isArray(result) ? result : []);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Unable to load blog posts.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const resetDraft = () => {
    setDraft(emptyDraft);
    setEditingId('');
    setError('');
  };

  const chooseImage = async (event) => {
    const [file] = Array.from(event.target.files || []);
    if (!file) return;
    try {
      const image = await compressImage(file);
      setDraft((current) => ({ ...current, image }));
      setError('');
    } catch (imageError) {
      setError(imageError.message || 'Unable to process image.');
    } finally {
      event.target.value = '';
    }
  };

  const saveBlog = async (event) => {
    event.preventDefault();
    setError('');
    if (!draft.image) {
      setError('Add an image before publishing the post.');
      return;
    }

    setSaving(true);
    try {
      const path = editingId ? `/admin/blogs/${editingId}` : '/admin/blogs';
      await apiRequest(path, {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(draft),
      });
      resetDraft();
      await loadBlogs();
    } catch (saveError) {
      setError(saveError.message || 'Unable to save the blog post.');
    } finally {
      setSaving(false);
    }
  };

  const editBlog = (blog) => {
    setDraft({ title: blog.title, body: blog.body, image: blog.image });
    setEditingId(blog._id);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteBlog = async (blog) => {
    if (!window.confirm(`Delete "${blog.title}"? This cannot be undone.`)) return;
    setError('');
    try {
      await apiRequest(`/admin/blogs/${blog._id}`, { method: 'DELETE' });
      setBlogs((current) => current.filter((item) => item._id !== blog._id));
      if (editingId === blog._id) resetDraft();
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete the blog post.');
    }
  };

  return (
    <AdminLayout activePage="blogs" onNavigate={onNavigate}>
      <main className="mx-auto w-full max-w-370 flex-1 px-4 py-8 sm:px-6 xl:px-8">
        <button type="button" onClick={() => onNavigate('admin')} className="btn-ghost mb-5"><ArrowLeft size={16} /> Back to admin</button>
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-coral-50 text-coral-500"><Newspaper size={21} /></div>
          <div><p className="text-xs font-semibold uppercase tracking-wider text-coral-500">Admin tools</p><h1 className="font-display text-3xl font-extrabold text-ink-900">Blog management</h1></div>
        </div>

        <form onSubmit={saveBlog} className="card mb-8 space-y-5 p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="font-display text-lg font-bold text-ink-900">{editingId ? 'Edit blog post' : 'Write a blog post'}</h2><p className="mt-1 text-sm text-ink-500">Posts are published as soon as you save them.</p></div>
            {editingId && <button type="button" onClick={resetDraft} className="btn-ghost"><X size={16} /> Cancel edit</button>}
          </div>
          <label className="block text-sm font-medium text-ink-700">Title
            <input className="input-field mt-1" value={draft.title} maxLength={160} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Give your post a title" required />
          </label>
          <label className="block text-sm font-medium text-ink-700">Body / text
            <textarea className="input-field mt-1 min-h-56 resize-y" value={draft.body} maxLength={50000} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} placeholder="Write your blog post..." required />
          </label>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-sm font-medium text-ink-700">Image</p><p className="mt-1 text-xs text-ink-500">Choose an image; it will be optimized before saving.</p></div>
              <label className="btn-ghost inline-flex cursor-pointer items-center gap-2"><ImagePlus size={16} />{draft.image ? 'Change image' : 'Choose image'}<input type="file" accept="image/*" onChange={chooseImage} className="hidden" /></label>
            </div>
            {draft.image && <img src={draft.image} alt="Selected blog post" className="mt-4 max-h-72 w-full rounded-2xl object-cover" />}
          </div>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={saving} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} />{saving ? 'Saving...' : editingId ? 'Save changes' : 'Publish post'}</button>
        </form>

        <section className="card overflow-hidden">
          <div className="border-b border-ink-100 p-5"><h2 className="font-display text-lg font-bold text-ink-900">Published posts</h2></div>
          <div className="divide-y divide-ink-100">
            {loading ? <p className="p-5 text-sm text-ink-500">Loading blog posts...</p> : blogs.length ? blogs.map((blog) => (
              <article key={blog._id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <img src={blog.image} alt="" className="h-24 w-full rounded-xl object-cover sm:w-36" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-bold text-ink-900">{blog.title}</h3>
                  <p className="mt-1 text-xs text-ink-500">Created {formatCreatedAt(blog.createdAt)}</p>
                  <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm text-ink-600">{blog.body}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => editBlog(blog)} className="btn-ghost"><Pencil size={15} /> Edit</button>
                  <button type="button" onClick={() => deleteBlog(blog)} className="btn-ghost text-red-600"><Trash2 size={15} /> Delete</button>
                </div>
              </article>
            )) : <p className="p-5 text-sm text-ink-500">No blog posts have been published.</p>}
          </div>
        </section>
      </main>
    </AdminLayout>
  );
}
