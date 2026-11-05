import { requireUser } from '@/lib/auth';
import CotizaApp from './CotizaApp';

export const dynamic = 'force-dynamic';
export default async function WorkspacePage() {
  await requireUser('/app');
  return <CotizaApp />;
}
