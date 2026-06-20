import DocumentWorkflow from '../components/DocumentWorkflow.jsx';

const cfg = {
  endpoint: '/shipping',
  noun: 'shipment',
  Noun: 'Shipment',
  icon: 'outbound',
  verb: 'ship',
  partyLabel: 'Customer',
  partyField: 'customer',
  partyPlaceholder: 'e.g. Northgate Retail',
  finalise: 'ship',
  finaliseLabel: 'Ship order',
  finalisedWord: 'shipped',
  finaliseHint: 'Shipping deducts every line from stock. It will fail if any location is short.',
  suggestRef: () => `SHP-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`,
};

export default function Shipping() {
  return <DocumentWorkflow cfg={cfg} />;
}
