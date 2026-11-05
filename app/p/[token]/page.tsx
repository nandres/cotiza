import PublicQuoteView from './PublicQuoteView';

export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicQuoteView token={token} />;
}
