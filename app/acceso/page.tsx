import AuthPage from './AuthPage';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const search = await searchParams;
  return <AuthPage next={typeof search.next === 'string' ? search.next : undefined} linkError={search.error === 'enlace'}/>;
}
