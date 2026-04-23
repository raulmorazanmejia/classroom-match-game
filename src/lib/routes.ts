export type AppView = 'login' | 'dashboard' | 'create' | 'play' | 'results';

export function readRoute(): { view: AppView; id: string | null } {
  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get('view') as AppView | null;
  const view = viewParam && ['login', 'dashboard', 'create', 'play', 'results'].includes(viewParam) ? viewParam : 'dashboard';
  return { view, id: params.get('id') };
}

export function setRoute(view: AppView, id?: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set('view', view);
  if (id) url.searchParams.set('id', id); else url.searchParams.delete('id');
  window.history.pushState({}, '', url);
  window.dispatchEvent(new Event('popstate'));
}

export function buildViewLink(view: AppView, id?: string): string {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('view', view);
  if (id) url.searchParams.set('id', id);
  return url.toString();
}
