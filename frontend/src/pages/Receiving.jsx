import DocumentWorkflow from '../components/DocumentWorkflow.jsx';

const cfg = {
  endpoint: '/receiving',
  noun: 'receipt',
  Noun: 'Receipt',
  icon: 'inbound',
  verb: 'receive',
  partyLabel: 'Supplier',
  partyField: 'supplier',
  partyPlaceholder: 'e.g. Acme Distribution',
  finalise: 'post',
  finaliseLabel: 'Post receipt',
  finalisedWord: 'posted',
  finaliseHint: 'Posting adds every line to stock and records the movements. This cannot be undone.',
  suggestRef: () => `GRN-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`,
};

export default function Receiving() {
  return <DocumentWorkflow cfg={cfg} />;
}
