import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Clock3, Newspaper } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { createBreadcrumbStructuredData, createSlug, extractIdFromSeoParam, setPageSeo } from '../lib/seo';

const formatCreatedAt = (value) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
}).format(new Date(value));

const formatCreatedTime = (value) => new Intl.DateTimeFormat(undefined, {
  timeStyle: 'short',
}).format(new Date(value));

const splitPlainText = (text) => String(text || '')
  .replace(/\r\n/g, '\n')
  .trim()
  .split(/\n\s*\n/)
  .filter(Boolean);

export default function BlogPage({ onNavigate }) {
  const { id: blogParam } = useParams();
  const id = blogParam ? extractIdFromSeoParam(blogParam) : '';
  const [result, setResult] = useState({ key: null, blogs: [], blog: null, error: '', loading: true });
  const viewKey = id || 'list';
  const isCurrentView = result.key === viewKey;
  const loading = !isCurrentView || result.loading;
  const error = isCurrentView ? result.error : '';
  const blogs = isCurrentView ? result.blogs : [];
  const blog = isCurrentView ? result.blog : null;

  useEffect(() => {
    let active = true;
    if (id) {
      setPageSeo({
        title: 'Haango Blog | Haango',
        description: 'Read the latest article from the Haango community.',
        robots: 'index,follow',
      });
    } else {
      setPageSeo({
        title: 'Haango Blog | Stories and Updates',
        description: 'Read stories, ideas and updates from the Haango community.',
        canonicalPath: '/blog',
        robots: 'index,follow',
      });
    }
    apiRequest(id ? `/blogs/${encodeURIComponent(id)}` : '/blogs')
      .then((data) => {
        if (!active) return;
        if (id && data) {
          const description = String(data.metaDescription || data.subtitle || data.introduction || data.body || '').replace(/\s+/g, ' ').trim().slice(0, 160);
          const canonicalPath = `/blog/${data.slug || createSlug(data.title)}-${String(data.id || data._id || id)}`;
          const seoCanonicalPath = data.slug ? `/blog/${data.slug}` : canonicalPath;
          setPageSeo({
            title: data.metaTitle || `${data.title} | Haango Blog`,
            description,
            canonicalPath: seoCanonicalPath,
            image: data.image,
            robots: 'index,follow',
            type: 'article',
            structuredData: [{
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: data.title,
              description,
              image: data.image,
              datePublished: data.createdAt,
              dateModified: data.updatedAt || data.createdAt,
              publisher: {
                '@type': 'Organization',
                name: 'Haango',
                url: 'https://haango.in',
              },
              mainEntityOfPage: `https://haango.in${seoCanonicalPath}`,
            }, createBreadcrumbStructuredData(seoCanonicalPath, { blog: 'Blog' })],
          });
          if (window.location.pathname !== seoCanonicalPath) {
            window.history.replaceState(window.history.state, '', seoCanonicalPath);
          }
        }
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
              <img src={blog.image} alt={blog.title} className="max-h-[520px] w-full rounded-3xl object-cover" />
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-500">
                <span className="inline-flex items-center gap-2"><CalendarDays size={16} />{formatCreatedAt(blog.createdAt)}</span>
                <span className="inline-flex items-center gap-2"><Clock3 size={16} />{formatCreatedTime(blog.createdAt)}</span>
              </div>
              <h1 className="mt-4 font-display text-3xl font-extrabold leading-[1.15] tracking-tight text-ink-900 sm:text-5xl">{blog.title}</h1>
              {blog.subtitle && <p className="mt-3 text-xl font-extrabold leading-7 text-ink-800 sm:text-2xl">{blog.subtitle}</p>}
              {blog.introduction && <p className="mt-5 whitespace-pre-wrap break-words text-base leading-7 text-ink-700 sm:text-lg">{blog.introduction}</p>}
              {Array.isArray(blog.contentBlocks) && blog.contentBlocks.length > 0 ? (
                <div className="mt-8">
                  {blog.contentBlocks.map((block, index) => {
                    if (block.type === 'heading') {
                      return block.level === 3
                        ? <h3 key={index} style={{ fontWeight: 800 }} className="mb-2 mt-7 font-display text-xl font-extrabold leading-[1.25] tracking-tight text-ink-900 sm:text-2xl">{block.text}</h3>
                        : <h2 key={index} style={{ fontWeight: 800 }} className="mb-3 mt-8 font-display text-2xl font-extrabold leading-[1.2] tracking-tight text-ink-900 sm:text-3xl">{block.text}</h2>;
                    }
                    if (block.type === 'image') {
                      return block.image
                        ? <figure key={index} className="my-6 overflow-hidden rounded-3xl"><img src={block.image} alt={block.alt || blog.title} loading="lazy" className="max-h-[520px] w-full rounded-3xl object-cover" />{block.alt && <figcaption className="mt-2 text-center text-xs text-ink-500">{block.alt}</figcaption>}</figure>
                        : null;
                    }
                    return <p key={index} className="mb-4 whitespace-pre-wrap break-words text-base leading-7 text-ink-700 sm:text-lg">{block.text}</p>;
                  })}
                </div>
              ) : (
                <div className="mt-8">
                  {splitPlainText(blog.body).map((paragraph, index) => (
                    <p key={index} className="mb-4 whitespace-pre-wrap break-words text-base leading-7 text-ink-700 sm:text-lg">{paragraph}</p>
                  ))}
                </div>
              )}
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
            {blogs.map((item) => {
              const introduction = String(item.introduction || '').trim();
              const firstH2 = item.contentBlocks?.find((block) => (
                block.type === 'heading' && (!block.level || block.level === 2) && block.text?.trim()
              ));
              const fallbackText = item.subtitle || item.body;

              return (
                <Link key={item._id} to={`/blog/${item.slug || `${createSlug(item.title)}-${item._id}`}`} className="card group overflow-hidden text-left transition hover:-translate-y-1 hover:shadow-lift">
                  <img src={item.image} alt={item.title} className="h-56 w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
                  <div className="p-5">
                    <p className="flex items-center gap-2 text-xs text-ink-500"><CalendarDays size={14} />{formatCreatedAt(item.createdAt)}</p>
                    <h2 className="mt-3 font-display text-xl font-bold text-ink-900">{item.title}</h2>
                    <div className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-ink-600">
                      {introduction ? (
                        <p><strong className="font-bold text-ink-800">Introduction: </strong>{introduction}</p>
                      ) : (
                        <p>{fallbackText}</p>
                      )}
                      {firstH2 && <p className="mt-1"><strong className="font-bold text-ink-800">{firstH2.text}</strong></p>}
                    </div>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-coral-600">Read the full post <ArrowLeft className="rotate-180" size={15} /></span>
                  </div>
                </Link>
              );
            })}
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
