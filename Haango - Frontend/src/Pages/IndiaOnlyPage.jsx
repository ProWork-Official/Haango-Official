function IndiaOnlyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffaf5] px-5 py-12">
      <section className="w-full max-w-xl rounded-3xl border border-[#eee4d8] bg-white p-8 text-center shadow-sm sm:p-12">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#ff7418]">Haango</p>
        <h1 className="mt-5 text-3xl font-extrabold text-ink-900 sm:text-4xl">
          Haango is currently available only in India
        </h1>
        <p className="mt-5 text-base leading-7 text-ink-600">
          Our website and services are currently designed for people in India. We’re sorry, but you can’t access the other pages from your current location.
        </p>
      </section>
    </main>
  );
}

export default IndiaOnlyPage;
