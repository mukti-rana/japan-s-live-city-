// A person's picture, or their initial when they have none. Pictures can only
// be ones they uploaded to the community's own storage.
export default function Avatar({ username, avatarUrl, size = 32 }: { username: string; avatarUrl: string | null; size?: number }) {
  const style = { width: size, height: size };
  return avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarUrl} alt="" loading="lazy" decoding="async" style={style} className="shrink-0 rounded-full object-cover" />
  ) : (
    <span aria-hidden="true" style={{ ...style, fontSize: Math.max(11, size * 0.42) }} className="flex shrink-0 items-center justify-center rounded-full bg-lilac/20 font-semibold uppercase text-lilac">
      {username.slice(0, 1)}
    </span>
  );
}
