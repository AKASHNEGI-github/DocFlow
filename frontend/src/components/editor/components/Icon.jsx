import IconStore from '../core/IconStore';

export default function Icon({ name }) {
  const svg = IconStore.get(name);
  if (!svg) return null;
  return <span className="jc-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}
