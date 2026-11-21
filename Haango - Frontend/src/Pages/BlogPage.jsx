import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock3, Newspaper } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';

const formatCreatedAt = (value) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
}).format(new Date(value));

const formatCreatedTime = (value) => new Intl.DateTimeFormat(undefined, {
  timeStyle: 'short',
}).format(new Date(value));

export default function BlogPage({ onNavigate }) {
  const { id } = useParams();
  const [result, setResult] = useState({ key: null, blogs: [], blog: null, error: '', loading: true });
  const viewKey = id || 'list';
  const isCurrentView = result.key === viewKey;
  const loading = !isCurrentView || result.loading;
  const error = isCurrentView ? result.error : '';
  const blogs = isCurrentView ? result.blogs : [];
  const blog = isCurrentView ? result.blog : null;

  useEffect(() => {
    let active = true;
    apiRequest(id ? `/blogs/${encodeURIComponent(id)}` : '/blogs')
      .then((data) => {
        if (!active) return;
        setResult({
          key: id || 'list',
          blogs: id ? [] : Array.isArray(data) ? data : [],
          blog: id ? data : null,
          error: '',
          loading: false,
        });
      })
      .catch((loadError) => {
        if (active) {
          setResult({
            key: id || 'list',
            blogs: [],
            blog: null,
            error: loadError.message || 'Unable to load blog posts.',
            loading: false,
          });
        }
      });

    return () => { active = false; };
  }, [id]);

  if (id) {
    return (
      <div className="min-h-[65vh] pt-24 pb-16">
        <article className="container-max section-pad max-w-4xl">
          <button type="button" onClick={() => onNavigate('/blog')} className="btn-ghost mb-6">
            <ArrowLeft size={16} /> All blog posts
          </button>
          {loading ? (
            <p className="py-16 text-center text-ink-500">Loading blog post...</p>
          ) : error ? (
            <p role="alert" className="rounded-2xl bg-red-50 p-5 text-red-700">{error}</p>
          ) : blog ? (
            <>
              <img src={blog.image} alt="" className="max-h-[520px] w-full rounded-3xl object-cover" />
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-500">
                <span className="inline-flex items-center gap-2"><CalendarDays size={16} />{formatCreatedAt(blog.createdAt)}</span>
                <span className="inline-flex items-center gap-2"><Clock3 size={16} />{formatCreatedTime(blog.createdAt)}</span>
              </div>
              <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-ink-900 sm:text-5xl">{blog.title}</h1>
              <div className="mt-8 whitespace-pre-wrap break-words text-base leading-8 text-ink-700 sm:text-lg">{blog.body}</div>
            </>
          ) : null}
        </article>
      </div>
    );
  }

  return (
    <div className="min-h-[65vh] pt-24 pb-16">
      <section className="container-max section-pad">
        <div className="max-w-3xl">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-coral-500"><Newspaper size={16} /> Haango Blog</p>
          <h1 className="mt-4 font-display text-4xl font-extrabold text-ink-900 sm:text-5xl">Stories, ideas, and updates</h1>
          <p className="mt-4 text-lg text-ink-600">Read the latest from the Haango community.</p>
        </div>
      </section>

      <section className="container-max section-pad pt-0">
        {loading ? (
          <p className="py-16 text-center text-ink-500">Loading blog posts...</p>
        ) : error ? (
          <p role="alert" className="rounded-2xl bg-red-50 p-5 text-red-700">{error}</p>
        ) : blogs.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {blogs.map((item) => (
              <button key={item._id} type="button" onClick={() => onNavigate(`/blog/${item._id}`)} className="card group overflow-hidden text-left transition hover:-translate-y-1 hover:shadow-lift">
                <img src={item.image} alt="" className="h-56 w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
                <div className="p-5">
                  <p className="flex items-center gap-2 text-xs text-ink-500"><CalendarDays size={14} />{formatCreatedAt(item.createdAt)}</p>
                  <h2 className="mt-3 font-display text-xl font-bold text-ink-900">{item.title}</h2>
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-ink-600">{item.body}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-coral-600">Read the full post <ArrowLeft className="rotate-180" size={15} /></span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="card py-16 text-center">
            <Newspaper className="mx-auto text-coral-500" size={32} />
            <h2 className="mt-4 font-display text-xl font-bold text-ink-900">No blog posts yet</h2>
            <p className="mt-2 text-sm text-ink-500">Please check back soon for stories from Haango.</p>
          </div>
        )}
      </section>
    </div>
  );
}
