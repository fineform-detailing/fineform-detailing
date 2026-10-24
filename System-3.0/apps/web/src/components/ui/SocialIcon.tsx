export function SocialIcon({ kind }: { kind: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {kind === "whatsapp" ? (
        <>
          <path d="M5 18 3 21l5-1a9 9 0 1 0-3-2Z" />
          <path d="M9 7c-2 3 2 7 5 8l2-2-2-1-1 1c-2-1-3-2-3-4l1-1-2-1Z" />
        </>
      ) : kind === "instagram" ? (
        <>
          <rect x="4" y="4" width="16" height="16" rx="5" />
          <circle cx="12" cy="12" r="3.5" />
          <circle className="icon-dot" cx="17" cy="7" r="1" />
        </>
      ) : kind === "tiktok" ? (
        <path d="M14 4v12a4 4 0 1 1-4-4M14 4c1 3 3 4 6 4" />
      ) : (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 6 9 7 9-7" />
        </>
      )}
    </svg>
  );
}
