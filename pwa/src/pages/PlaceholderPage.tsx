interface PlaceholderPageProps {
  title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return <p className="empty">TODO: Implementar a página {title}</p>;
}
