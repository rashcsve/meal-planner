interface ErrorStateProps {
  title: string;
  message: string;
  requestId?: string;
}

export function ErrorState({ title, message, requestId }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded border border-l-2 border-promo bg-promo-tint/35 px-2.75 py-2.25 text-11 leading-normal text-ink"
    >
      <p className="font-bold">{title}</p>
      <p>{message}</p>
      {requestId && (
        <p className="text-10 text-faint">Request {requestId}</p>
      )}
    </div>
  );
}
