interface PlaceholderPageProps {
  title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return <p className="empty">{title} - Em desenvolvimento</p>;
}
