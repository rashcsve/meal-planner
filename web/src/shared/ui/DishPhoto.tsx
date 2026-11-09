interface DishPhotoProps {
  name: string;
  photoUrl?: string | null;
}

export function DishPhoto({ name, photoUrl }: DishPhotoProps) {
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className="block size-full rounded-card object-cover" />;
  }
  return (
    <div
      data-dish-tile
      className="flex size-full items-center justify-center overflow-hidden rounded-card bg-fill p-3 text-center text-ink type-section break-words"
    >
      <span className="line-clamp-3">{name}</span>
    </div>
  );
}
