export function shouldTrackPageVisit(hostname, pathname) {
  const isLocalhost = hostname === 'localhost' || hostname.endsWith('.localhost');
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
  return !isLocalhost && !isAdminRoute;
}
