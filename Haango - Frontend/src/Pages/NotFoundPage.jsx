import { useEffect } from 'react';
import { Compass } from 'lucide-react';

function NotFoundPage({ onNavigate }) {
  useEffect(() => {
    document.title = 'Page Not Found | Haango';
  }, []);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-5 py-16">
      <section className="w-full max-w-xl rounded-3xl border border-[#eee4d8] bg-white p-8 text-center shadow-sm sm:p-12">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff1e6] text-[#ff7418]">
          <Compass size={26} />
        </div>
        <p className="mt-5 text-sm font-bold uppercase tracking-[0.2em] text-[#ff7418]">404</p>
        <h1 className="mt-3 text-3xl font-extrabold text-ink-900">Page not found</h1>
        <p className="mt-4 text-base leading-7 text-ink-600">
          The page you are looking for does not exist or may have moved.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="mt-7 rounded-full bg-[#ff7418] px-6 py-3 font-semibold text-white transition hover:bg-[#e96510]"
        >
          Return to homepage
        </button>
      </section>
    </main>
  );
}

export default NotFoundPage;
